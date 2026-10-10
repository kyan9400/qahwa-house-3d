import type { MetadataRoute } from "next";

const siteUrl = "https://qahwa-house-3d.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
