// Creates a .webp next to every image in public/img that doesn't have one yet (runs before `npm run build`).
// A .webp is only kept when it is clearly smaller than the original. Originals are never changed.
// Uses sharp, which is installed together with Next.js; if it is missing, the build continues without it.
import fs from "node:fs";
import path from "node:path";

let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.warn("optimize-images: sharp not available, skipping WebP generation");
  process.exit(0);
}

const root = path.join(process.cwd(), "public", "img");
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(jpe?g|png)$/i.test(e.name)) files.push(p);
  }
})(root);

let made = 0;
for (const f of files) {
  const out = f.replace(/\.(jpe?g|png)$/i, ".webp");
  if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(f).mtimeMs) continue;
  const buf = await sharp(f).webp({ quality: /\.png$/i.test(f) ? 85 : 80, effort: 6 }).toBuffer();
  if (buf.length < fs.statSync(f).size * 0.95) {
    fs.writeFileSync(out, buf);
    made++;
  } else if (fs.existsSync(out)) fs.rmSync(out);
}
console.log(`optimize-images: ${made} new WebP file(s)`);
