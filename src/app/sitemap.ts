import type { MetadataRoute } from "next";

const siteUrl = "https://qahwa-house-3d.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: siteUrl, lastModified: new Date("2026-10-10"), changeFrequency: "monthly", priority: 1 }];
}
