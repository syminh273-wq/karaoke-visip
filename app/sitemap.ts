import type { MetadataRoute } from "next";
import { SITE_URL, PATHS } from "@/lib/site";

export const dynamic = "force-static";

// Sitemap URLs must be absolute, so the list stays empty until SITE_URL is set (see lib/site.ts).
export default function sitemap(): MetadataRoute.Sitemap {
  if (!SITE_URL) return [];
  const priority = { site: 1, restaurant: 0.9, karaoke: 0.9 } as const;
  return (Object.keys(PATHS) as (keyof typeof PATHS)[]).map((v) => ({
    url: SITE_URL + PATHS[v],
    // no lastModified: the site has no real per-page edit dates, and a build date would be misleading
    changeFrequency: "weekly",
    priority: priority[v],
  }));
}
