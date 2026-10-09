const links = [
  { href: "#menu", label: "Menu", hideSm: false },
  { href: "#origins", label: "Origins", hideSm: true },
  { href: "#house", label: "The House", hideSm: true },
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
        <nav aria-label="Main">
          <ul className="flex items-center gap-1 sm:gap-2">
            {links.map((l) => (
              <li key={l.href} className={l.hideSm ? "hidden md:block" : "hidden min-[400px]:block"}>
                <a
                  href={l.href}
                  className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-sand transition-colors hover:text-crema"
                >
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <a href="#visit" className="btn btn-primary ml-1 min-h-11 px-5 py-2 text-sm">
                Visit
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
