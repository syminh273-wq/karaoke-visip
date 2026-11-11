import fs from "node:fs";
import path from "node:path";

/**
 * Modern image formats with the original as fallback.
 *
 * For every /img/x.jpg (or .png) that has a /img/x.webp (and/or /img/x.avif) next to it,
 * the page offers the smaller format first; browsers that can't use it load the original.
 * Only files that really exist are offered, so a new photo without a .webp simply stays .jpg.
 * `npm run build` creates missing .webp files first (scripts/optimize-images.mjs).
 */

const PUBLIC = path.join(process.cwd(), "public");

function scan(ext: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(ext)) {
        const base = p.slice(0, -ext.length);
        const orig = [".jpg", ".jpeg", ".png"].map((x) => base + x).find((x) => fs.existsSync(x));
        if (orig) out.push("/" + path.relative(PUBLIC, orig).split(path.sep).join("/"));
      }
    }
  };
  walk(path.join(PUBLIC, "img"));
  return out.sort();
}

/** Original image paths (e.g. "/img/a.jpg") that have a .webp / .avif sibling. */
export function imageVariants() {
  return { webp: new Set(scan(".webp")), avif: new Set(scan(".avif")) };
}

const swap = (src: string, ext: string) => src.replace(/\.(jpe?g|png)$/i, ext);

/** Adds WebP/AVIF alternatives to the static markup (app/markup.html). Layout is unchanged. */
export function modernizeImages(html: string): string {
  const { webp, avif } = imageVariants();
  const alts = (src: string, media = "", attrs = "") => {
    const m = media ? ` media="${media}"` : "";
    return (
      (avif.has(src) ? `<source${m} type="image/avif" srcset="${swap(src, ".avif")}"${attrs}>` : "") +
      (webp.has(src) ? `<source${m} type="image/webp" srcset="${swap(src, ".webp")}"${attrs}>` : "")
    );
  };

  // 1) Existing <picture>: add modern sources in front of each original source and of the <img>.
  html = html.replace(/<picture>([\s\S]*?)<\/picture>/g, (_m, inner: string) => {
    inner = inner.replace(/<source([^>]*?)\smedia="([^"]+)"([^>]*?)\ssrcset="([^"]+)"([^>]*)>/g, (s, a, media, b, src, c) => {
      const size = (a + b + c).match(/\s(width|height)="\d+"/g)?.join("") ?? "";
      return alts(src, media, size) + s;
    });
    inner = inner.replace(/<img\b[^>]*\ssrc="([^"]+)"[^>]*>/, (img, src) => alts(src) + img);
    return `<picture>${inner}</picture>`;
  });

  // 2) Plain <img src="/img/…"> outside a <picture>: wrap it (display:contents keeps the layout).
  const parts = html.split(/(<picture>[\s\S]*?<\/picture>)/g);
  html = parts
    .map((part, i) =>
      i % 2
        ? part
        : part.replace(/<img\b[^>]*\ssrc="(\/img\/[^"]+)"[^>]*>/g, (img, src) =>
            webp.has(src) || avif.has(src) ? `<picture class="wp">${alts(src)}${img}</picture>` : img,
          ),
    )
    .join("");

  // 3) Inline background images: browsers that support image-set() pick WebP, others keep the original.
  html = html.replace(/background-image:url\('(\/img\/[^']+)'\)/g, (m, src) =>
    webp.has(src) ? `${m};background-image:image-set(url('${swap(src, ".webp")}') type('image/webp'),url('${src}') type('image/jpeg'))` : m,
  );
  return html;
}
