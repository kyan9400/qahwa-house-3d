import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope, Reem_Kufi } from "next/font/google";
import { MOTION_BOOT_SCRIPT } from "@/lib/motion";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
  display: "swap",
  variable: "--font-fraunces",
});

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

const reem = Reem_Kufi({
  subsets: ["arabic"],
  display: "swap",
  // decorative Arabic lettering only (logo mark, menu titles): not needed for the hero paint, so not preloaded
  preload: false,
  variable: "--font-reem",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://qahwa-house-3d.vercel.app";
const description =
  "Qahwa House roasts single-origin coffee in small batches and serves it two ways: cardamom-and-saffron qahwa and precise modern pour-overs. A concept site with a real-time 3D pour.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Qahwa House — Specialty coffee, poured slowly",
    template: "%s · Qahwa House",
  },
  description,
  applicationName: "Qahwa House",
  authors: [{ name: "Alhassan Alfarran", url: "https://alhassan-portfolio-sigma.vercel.app" }],
  creator: "Alhassan Alfarran",
  keywords: ["specialty coffee", "qahwa", "Arabic coffee", "pour-over", "coffee roastery", "3D website", "WebGL"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
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
      className={`${fraunces.variable} ${manrope.variable} ${reem.variable}`}
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
