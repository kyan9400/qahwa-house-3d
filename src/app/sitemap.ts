import type { MetadataRoute } from "next";
import { IS_PAGES, SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: IS_PAGES ? `${SITE_URL}/` : SITE_URL, lastModified: new Date("2026-10-10"), changeFrequency: "monthly", priority: 1 }];
}
