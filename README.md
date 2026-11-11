# Nhà Hàng Hầm Rượu & Karaoke VSIP — website

Next.js 15 project, exported as a fully static site (no server needed).

## Run locally

```bash
npm install
npm run dev          # http://localhost:3000
```

## Build for hosting

```bash
npm run build        # writes the finished website to ./out
npm start            # preview ./out at http://localhost:3000
```

Upload the **contents of `out/`** to any static host.

## Hosting options

| Host | How |
|---|---|
| **Vercel** | Push this folder to GitHub → "Add New Project" on vercel.com → import. Defaults work. |
| **Netlify** | Build command `npm run build`, publish directory `out`. Or drag-and-drop the `out` folder on app.netlify.com/drop. |
| **Cloudflare Pages** | Build command `npm run build`, output directory `out`. |
| **cPanel / shared hosting** | Run `npm run build`, then upload everything inside `out/` to `public_html/`. |
| **VPS (Nginx)** | Copy `out/` to the server and point `root` at it. |

> The videos in `public/vid/` total ~70 MB. Fine on Vercel, Netlify and Cloudflare, but some hosts limit single
> files to 25 MB, and every file here is under 10 MB.

## Where to edit

| What | File |
|---|---|
| Text, prices, phone numbers, links | `app/markup.html` |
| Styles / colors / layout | `app/globals.css` |
| Interactive behaviour (sliders, menu, language switch, lightbox…) | `public/js/site-01.js` … `site-08.js` (loaded in order) |
| English / Chinese translations | `public/js/site-08.js` |
| Page title, description, favicon | `app/layout.tsx` |
| Images and videos | `public/img/`, `public/vid/` |

Pages: `/` (home), `/restaurant/`, `/karaoke/` (real URLs; old `/#restaurant` links redirect automatically).

## SEO

| What | Where |
|---|---|
| **Main domain** (canonical links, sitemap, share images) | Set `NEXT_PUBLIC_SITE_URL=https://your-domain` when building (e.g. in Cloudflare build settings), or put it in `lib/site.ts`. Until it is set, canonical/og:url/og:image and sitemap entries are left out. |
| Page titles, descriptions, business info, structured data (JSON-LD) | `lib/site.ts` |
| Share images (Facebook/Zalo, 1200×630) | `public/og/` |
| `robots.txt`, `sitemap.xml` | `app/robots.ts`, `app/sitemap.ts` |
| Cloudflare cache rules | `public/_headers` |

How it works:

- Each page (`/`, `/restaurant/`, `/karaoke/`) is built with its own view visible, and the parts that `public/js/site-01.js` draws (full menu of all dishes, galleries, rooms) are rendered into the HTML at build time (`lib/prerender.ts` runs `site-01.js` in a sandbox). Search engines see the full content; in the browser the script redraws the same HTML.
- Photos: every `public/img/*.jpg|png` gets a smaller `.webp` next to it (originals are kept as fallback). `npm run build` creates missing ones automatically; run `npm run images` to do it by hand. Hero banners also have `.avif` versions.
- Fonts are self-hosted (`app/fonts.css`, `public/fonts/`). The icon font only contains the icons the site uses: if you add a new icon name in `<span class="ms">…</span>`, it must be added to that font (re-download from Google Fonts with `icon_names=`).
