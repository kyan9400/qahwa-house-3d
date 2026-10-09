import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-[100svh] items-center bg-espresso">
      <div className="mx-auto w-full max-w-[720px] px-4 py-24 text-center sm:px-8">
        <svg viewBox="0 0 200 120" className="mx-auto w-48" aria-hidden="true">
          <ellipse cx="100" cy="100" rx="86" ry="14" fill="#2a1b12" />
          <ellipse cx="100" cy="96" rx="82" ry="12" fill="#e9dcc5" />
          <path d="M150 52c22-2 25 22 2 34" fill="none" stroke="#8f3a1b" strokeWidth="8" strokeLinecap="round" />
          <path d="M46 46c1 26 12 44 30 50h48c18-6 29-24 30-50z" fill="#9a3d1c" />
          <ellipse cx="100" cy="46" rx="54" ry="12" fill="#efe3cf" />
          <ellipse cx="100" cy="47" rx="47" ry="9" fill="#d8c8aa" />
        </svg>
        <p className="eyebrow mt-8 text-saffron">Error 404</p>
        <h1 className="display-lg mt-3 text-crema">This cup is empty.</h1>
        <p className="mx-auto mt-5 max-w-[42ch] text-lg text-sand">
          The page you were looking for has been cleared from the table.
        </p>
        <Link href="/" className="btn btn-primary mt-8">
          Back to the house
        </Link>
        <p className="mt-12 text-sm text-sand">Concept project — fictional brand. © 2026 Alhassan Alfarran</p>
      </div>
    </main>
  );
}
