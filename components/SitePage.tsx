import fs from "node:fs";
import path from "node:path";
import SiteScripts from "@/components/SiteScripts";
import { prerender, type View } from "@/lib/prerender";
import { imageVariants, modernizeImages } from "@/lib/images";
import { pageTitles } from "@/lib/site";

// The page markup lives in app/markup.html (edit text/prices/links there).
// It is read at build time and rendered as static HTML (re-read on every request in `npm run dev`).
// Each route (/, /restaurant/, /karaoke/) gets HTML for its own view: that view is visible, the nav
// marks it as current, and the parts site-01.js fills in (menu, gallery, rooms…) are already rendered,
// so search engines and link previews see the real page. site-01.js then re-renders the same HTML.
const readMarkup = () => fs.readFileSync(path.join(process.cwd(), "app", "markup.html"), "utf8");

// Which JS-filled containers belong to which view.
const VIEW_CONTAINERS: Record<View, string[]> = {
  site: ["menuItems", "roomItems"],
  restaurant: ["rGallery", "rCatNav", "rMenu", "mbWrap"],
  karaoke: ["kGallery", "kRooms"],
};
const VIEW_COUNTERS: Record<View, string[]> = {
  site: [],
  restaurant: ["rDishCount", "rPriceFrom"],
  karaoke: ["kRoomCount", "kCap", "kPriceFrom"],
};

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function buildMarkup(view: View): string {
  let html = readMarkup();

  // 1) Show this route's view, hide the others (same as route() in site-01.js does after load).
  for (const v of ["site", "restaurant", "karaoke"] as const) {
    html = html.replace(new RegExp(`<div id="view-${v}"( hidden)?>`), `<div id="view-${v}"${v === view ? "" : " hidden"}>`);
  }

  // 2) Mark the current page in the desktop nav, mobile menu and bottom nav.
  html = html.replace(new RegExp(`(<a [^>]*id="nl-${view}")`), `$1 aria-current="page"`);
  html = html.replace(new RegExp(`(<a [^>]*data-v="${view}")`, "g"), `$1 aria-current="page"`);

  // 3) Karaoke page uses the karaoke Zalo number (same as route() in site-01.js).
  if (view === "karaoke") {
    html = html.replace(
      '<a class="fab fab-zalo" id="mZalo" href="https://zalo.me/0337800100" target="_blank" rel="noopener" aria-label="Nhắn Zalo 0337.800.100"',
      '<a class="fab fab-zalo" id="mZalo" href="https://zalo.me/0964946673" target="_blank" rel="noopener" aria-label="Nhắn Zalo 0964.94.66.73"',
    );
  }

  // 4) Image loading: the visible view's hero loads first; images in hidden views wait until shown.
  html = prioritizeImages(html, view);

  // 5) WebP/AVIF alternatives for the static images (JS-rendered ones get them from site-01.js).
  html = modernizeImages(html);

  // 6) Fill in the JS-rendered parts of this view.
  const snap = prerender(view);
  for (const id of VIEW_CONTAINERS[view]) {
    const inner = snap.html[id];
    if (!inner) continue;
    html = html.replace(new RegExp(`(<(div|section|ul)[^>]*id="${esc(id)}"[^>]*>)(</\\2>)`), (_m, open, _t, close) => open + inner + close);
  }
  for (const id of VIEW_COUNTERS[view]) {
    const t = snap.text[id];
    if (!t) continue;
    html = html.replace(new RegExp(`(<([a-z]+)[^>]*id="${esc(id)}"[^>]*>)[^<]*(</\\2>)`), (_m, open, _t, close) => open + t + close);
  }
  return html;
}

const VIEW_ORDER = ["site", "restaurant", "karaoke"] as const;

/** Hero <img> of each view: [mobile source, desktop src] from its first <picture>. */
function heroOf(html: string, view: View): { mobile?: string; desktop?: string } {
  const [start, end] = viewBounds(html, view);
  const pic = html.slice(start, end).match(/<picture>([\s\S]*?)<\/picture>/);
  if (!pic) return {};
  return {
    mobile: pic[1].match(/<source[^>]*media="\(max-width:760px\)"[^>]*srcset="([^"]+)"/)?.[1],
    desktop: pic[1].match(/<img\b[^>]*\ssrc="([^"]+)"/)?.[1],
  };
}

/** [start, end) of a view's markup. Views appear in order site → restaurant → karaoke, then the footer. */
function viewBounds(html: string, view: View): [number, number] {
  const starts = VIEW_ORDER.map((v) => html.indexOf(`<div id="view-${v}"`));
  const i = VIEW_ORDER.indexOf(view);
  const footer = html.indexOf('<footer class="site-foot');
  return [starts[i], i + 1 < starts.length ? starts[i + 1] : footer > 0 ? footer : html.length];
}

function prioritizeImages(html: string, view: View): string {
  // Work from the last view to the first so earlier offsets stay valid.
  for (const v of [...VIEW_ORDER].reverse()) {
    const [start, end] = viewBounds(html, v);
    if (start < 0) continue;
    let part = html.slice(start, end);
    if (v === view) {
      // First <img> inside the first <picture> = the hero (LCP): load eagerly with high priority.
      part = part.replace(
        /(<picture>[\s\S]*?)<img\b([^>]*)>/,
        (_m, before, attrs: string) =>
          `${before}<img${attrs.replace(/\sloading="lazy"/, "").replace(/\sfetchpriority="[^"]*"/, "")} fetchpriority="high">`,
      );
    } else {
      // Hidden view: don't download its images until the visitor opens it.
      part = part.replace(/<img\b(?![^>]*\sloading=)([^>]*)>/g, '<img loading="lazy"$1>');
    }
    html = html.slice(0, start) + part + html.slice(end);
  }
  return html;
}

/** <link rel="preload"> for the hero of this view (AVIF when available; browsers without AVIF skip it). */
function HeroPreload({ view }: { view: View }) {
  const { mobile, desktop } = heroOf(readMarkup(), view);
  const { avif, webp } = imageVariants();
  const best = (src?: string) =>
    !src ? null : avif.has(src) ? { href: src.replace(/\.(jpe?g|png)$/i, ".avif"), type: "image/avif" } : webp.has(src) ? { href: src.replace(/\.(jpe?g|png)$/i, ".webp"), type: "image/webp" } : { href: src, type: undefined };
  const m = best(mobile), d = best(desktop);
  return (
    <>
      {m && <link rel="preload" as="image" href={m.href} type={m.type} media="(max-width:760px)" fetchPriority="high" />}
      {d && <link rel="preload" as="image" href={d.href} type={d.type} media={mobile ? "(min-width:761px)" : undefined} fetchPriority="high" />}
    </>
  );
}

export default function SitePage({ view = "site" }: { view?: View }) {
  const markup = buildMarkup(view);
  const webpList = JSON.stringify([...imageVariants().webp]);
  return (
    <>
      <HeroPreload view={view} />
      {/* read by site-01.js (must run before it): images that have a .webp, and the page titles */}
      <script dangerouslySetInnerHTML={{ __html: `window.__WEBP=${webpList};window.__TITLES=${JSON.stringify(pageTitles()).replace(/</g, "\\u003c")};` }} />
      <div id="vsip-root" style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: markup }} />
      <SiteScripts />
    </>
  );
}
