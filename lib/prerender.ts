import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { imageVariants } from "@/lib/images";

/**
 * Build-time prerender of the JS-rendered parts of the site (menu, gallery, rooms…).
 *
 * public/js/site-01.js builds these parts as HTML strings (`el.innerHTML = \`…\``).
 * Here we run that same file in a sandbox with a tiny fake DOM, call its render
 * functions, and collect the HTML each container would receive in the browser.
 * The result is injected into the static page, so crawlers see the full content,
 * and the browser later re-renders the exact same HTML (no visual change).
 */

export type View = "site" | "restaurant" | "karaoke";

// Containers whose innerHTML is produced by site-01.js and is safe to prerender.
const CONTAINERS = ["menuItems", "roomItems", "rGallery", "rCatNav", "rMenu", "mbWrap", "kGallery", "kRooms"] as const;
// Small text counters filled by the same render functions.
const COUNTERS = ["rDishCount", "rPriceFrom", "kRoomCount", "kCap", "kPriceFrom"] as const;

export type Dish = { id: number; name: string; sec: string; desc: string; vi?: string; price: number; unit?: string; img: string; active: boolean };
type Snapshot = { html: Record<string, string>; text: Record<string, string>; dishes: Dish[]; sections: Record<string, string> };

/** A do-nothing object that tolerates any property access, call, assignment or iteration. */
function inert(): any {
  const fn = function () {};
  return new Proxy(fn, {
    get(_t, k) {
      if (k === Symbol.toPrimitive) return () => "";
      if (k === Symbol.iterator) return function* () {};
      if (k === "length") return 0;
      if (k === "then") return undefined;
      return inert();
    },
    set: () => true,
    apply: () => inert(),
    construct: () => inert(),
  });
}

function fakeElement(id: string, store: Map<string, any>) {
  const el: any = new Proxy(
    { id, innerHTML: "", textContent: "", hidden: false, value: "", dataset: {}, style: {}, options: [] as any[] },
    {
      get(t: any, k) {
        if (k in t) return t[k];
        if (k === "closest" || k === "querySelector") return () => null;
        if (k === "querySelectorAll" || k === "getElementsByTagName") return () => [];
        return inert();
      },
      set(t: any, k, v) {
        t[k] = v;
        return true;
      },
    },
  );
  store.set(id, el);
  return el;
}

function runSite(view: View): Snapshot {
  const file = path.join(process.cwd(), "public", "js", "site-01.js");
  const code = fs.readFileSync(file, "utf8");
  const els = new Map<string, any>();
  const document: any = new Proxy(
    {
      getElementById: (id: string) => els.get(id) ?? fakeElement(id, els),
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: () => {},
      documentElement: inert(),
      body: inert(),
      createElement: () => inert(),
    },
    { get: (t: any, k) => (k in t ? t[k] : inert()) },
  );
  const location = { pathname: view === "site" ? "/" : `/${view}/`, hash: "", search: "", href: "", origin: "" };
  const win: any = {
    document,
    location,
    history: { pushState() {}, replaceState() {} },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    navigator: { userAgent: "prerender", clipboard: inert() },
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {},
    requestAnimationFrame: () => 0,
    cancelAnimationFrame() {},
    setTimeout: () => 0,
    clearTimeout() {},
    setInterval: () => 0,
    clearInterval() {},
    scrollTo() {},
    scrollBy() {},
    IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} },
    ResizeObserver: class { observe() {} unobserve() {} disconnect() {} },
    MutationObserver: class { observe() {} disconnect() {} },
    Event: class { constructor(public type: string) {} },
    CustomEvent: class { constructor(public type: string) {} },
    Image: class {},
    getComputedStyle: () => inert(),
    console: { log() {}, warn() {}, error() {}, info() {} },
    innerWidth: 1280,
    innerHeight: 900,
    devicePixelRatio: 1,
    performance: { now: () => 0 },
    Intl, Math, JSON, Date, Number, String, Array, Object, Set, Map, RegExp, Symbol, Promise, Error, encodeURIComponent, decodeURIComponent, parseInt, parseFloat, isNaN,
  };
  win.__WEBP = [...imageVariants().webp]; // same list the page gets, so the HTML matches the browser's
  win.window = win;
  win.self = win;
  win.globalThis = win;
  const ctx = vm.createContext(win);
  // Run the file, then call the render functions for the requested view.
  // Inside the IIFE (before its final "})();"), render the requested view and hand the menu data back.
  const hook =
    `\n;try{renderLanding()}catch(e){}` +
    `;try{if(${JSON.stringify(view)}==="restaurant")renderRestaurant()}catch(e){}` +
    `;try{if(${JSON.stringify(view)}==="karaoke")renderKaraoke()}catch(e){}` +
    `;window.__prerenderData=JSON.stringify({dishes:db.dishes.filter(d=>d.active),sections:SEC});\n`;
  const end = code.lastIndexOf("})();");
  if (end < 0) throw new Error("prerender: site-01.js no longer ends with an IIFE");
  vm.runInContext(code.slice(0, end) + hook + code.slice(end), ctx, { filename: "site-01.js", timeout: 5000 });
  const html: Record<string, string> = {};
  const text: Record<string, string> = {};
  for (const id of CONTAINERS) {
    const v = els.get(id)?.innerHTML;
    if (typeof v === "string" && v) html[id] = v;
  }
  for (const id of COUNTERS) {
    const v = els.get(id)?.textContent;
    if (typeof v === "string" && v) text[id] = v;
  }
  // Menu data (same objects the page renders), for structured data.
  const data = JSON.parse(win.__prerenderData || '{"dishes":[],"sections":{}}');
  return { html, text, dishes: data.dishes, sections: data.sections };
}

const cache = new Map<View, Snapshot>();

/** Rendered HTML for each JS-filled container, as site-01.js would produce it for this view. */
export function prerender(view: View): Snapshot {
  // Re-run on every request in dev so edits to site-01.js show up; cache in production builds.
  if (process.env.NODE_ENV !== "production") return runSite(view);
  if (!cache.has(view)) cache.set(view, runSite(view));
  return cache.get(view)!;
}
