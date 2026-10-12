import type { NextConfig } from "next";

// GH_PAGES=1 builds the static GitHub Pages mirror; the Vercel build is unchanged.
const pages = process.env.GH_PAGES === "1";
const basePath = "/qahwa-house-3d";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // exposed so metadata and SEO files know which host they are built for
  env: { NEXT_PUBLIC_GH_PAGES: pages ? "1" : "" },
  ...(pages && {
    output: "export",
    basePath,
    assetPrefix: basePath,
    trailingSlash: true,
    images: { unoptimized: true },
  }),
};

export default nextConfig;
