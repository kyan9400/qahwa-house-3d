// Primary (canonical) host on Vercel, plus the GitHub Pages mirror.
export const CANONICAL_URL = "https://qahwa-house-3d.vercel.app";
export const PAGES_ORIGIN = "https://kyan9400.github.io";
export const PAGES_URL = `${PAGES_ORIGIN}/qahwa-house-3d`;

export const IS_PAGES = process.env.NEXT_PUBLIC_GH_PAGES === "1";

// The host this build is served from (OG images, sitemap, robots).
export const SITE_URL = IS_PAGES ? PAGES_URL : CANONICAL_URL;
// metadataBase: origin only, because Next already prefixes file-based image paths with basePath.
export const METADATA_BASE = IS_PAGES ? PAGES_ORIGIN : CANONICAL_URL;
