import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope, Reem_Kufi } from "next/font/google";
import { MOTION_BOOT_SCRIPT } from "@/lib/motion";
import { CANONICAL_URL, METADATA_BASE } from "@/lib/site";
import "./globals.css";

// roman display face: only the optical-size axis (SOFT dropped) keeps the preloaded file small
const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
  variable: "--font-fraunces",
});

// a real italic for the hero's second line and the guestbook quotes (no faux-oblique).
// Not preloaded: roman + Manrope already use ~92 KB of the 110 KB font budget; the size-adjusted fallback keeps CLS at 0.
const frauncesItalic = Fraunces({
  subsets: ["latin"],
  style: "italic",
  weight: ["300", "400"],
  display: "swap",
  variable: "--font-fraunces-italic",
  preload: false,
});

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

const reem = Reem_Kufi({
  subsets: ["arabic"],
  display: "swap",
  // decorative Arabic lettering only (logo mark, hero outline glyph): not needed for the hero paint, so not preloaded
  preload: false,
  variable: "--font-reem",
});

const description =
  "Qahwa House roasts single-origin coffee in small batches and serves it two ways: cardamom-and-saffron qahwa and precise modern pour-overs. A concept site with a real-time 3D pour.";

export const metadata: Metadata = {
  metadataBase: new URL(METADATA_BASE),
  title: {
    default: "Qahwa House — Specialty coffee, poured slowly",
    template: "%s · Qahwa House",
  },
  description,
  applicationName: "Qahwa House",
  authors: [{ name: "Alhassan Alfarran", url: "https://alhassan-portfolio-sigma.vercel.app" }],
  creator: "Alhassan Alfarran",
  keywords: ["specialty coffee", "qahwa", "Arabic coffee", "pour-over", "coffee roastery", "3D website", "WebGL"],
  // the Pages mirror points search engines at the Vercel original
  alternates: { canonical: `${CANONICAL_URL}/` },
  openGraph: {
    type: "website",
    url: `${CANONICAL_URL}/`,
    siteName: "Qahwa House",
    title: "Qahwa House — Specialty coffee, poured slowly",
    description,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Qahwa House — Specialty coffee, poured slowly",
    description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#1a110b",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${frauncesItalic.variable} ${manrope.variable} ${reem.variable}`}
      data-motion="full"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: MOTION_BOOT_SCRIPT }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
