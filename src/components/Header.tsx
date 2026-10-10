import MobileNav from "@/components/MobileNav";

const links = [
  { href: "#menu", label: "Menu" },
  { href: "#origins", label: "Origins" },
  { href: "#house", label: "The House" },
];

export default function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-walnut/60 bg-espresso/95">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-3 px-4 sm:px-8">
        <a href="#top" className="flex min-h-11 items-center gap-2 text-crema" aria-label="Qahwa House, back to top">
          <span className="font-display text-xl font-medium tracking-tight sm:text-2xl">Qahwa House</span>
          <span lang="ar" className="font-arabic text-lg text-saffron" aria-hidden="true">
            قهوة
          </span>
        </a>
        <nav aria-label="Main" className="flex items-center gap-2">
          <ul className="flex items-center gap-1 sm:gap-2">
            {links.map((l) => (
              <li key={l.href} className="hidden md:block">
                <a
                  href={l.href}
                  className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-sand transition-colors hover:text-crema"
                >
                  {l.label}
                </a>
              </li>
            ))}
            {/* below 400px the Visit button lives in the mobile panel so the bar never crowds at 320px */}
            <li className="hidden min-[400px]:block">
              <a href="#visit" className="btn btn-primary ml-1 min-h-11 px-5 py-2 text-sm">
                Visit
              </a>
            </li>
          </ul>
          <MobileNav links={links} />
        </nav>
      </div>
    </header>
  );
}
