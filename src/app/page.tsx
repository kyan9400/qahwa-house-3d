import Header from "@/components/Header";
import MotionToast from "@/components/MotionToast";
import MotionToggle from "@/components/MotionToggle";
import Stage from "@/components/Stage";

const MENU = [
  {
    name: "Saffron Cardamom Latte",
    price: "5.80",
    serve: "Hot · stoneware cup, 240 ml",
    body: "A double ristretto of our Haraz house roast, steamed whole or oat milk, a thread of saffron and green cardamom crushed to order.",
    notes: ["Honey", "Saffron", "Warm spice"],
  },
  {
    name: "Qahwa Saada",
    price: "4.50",
    serve: "Hot · finjan, refilled until you shake the cup",
    body: "The traditional welcome. Lightly roasted Yemeni beans simmered with cardamom, clove and a pinch of saffron, poured from the dallah and served with dates.",
    notes: ["Bright", "Floral", "Cardamom"],
  },
  {
    name: "Guji Pour-Over",
    price: "6.20",
    serve: "Hot · glass, 300 ml",
    body: "Washed Ethiopian heirloom from the Guji highlands, brewed by hand on a cone filter at 93 °C. Tea-like body with stone fruit and jasmine.",
    notes: ["Peach", "Jasmine", "Bergamot"],
  },
  {
    name: "Cold Brew Tonic",
    price: "6.00",
    serve: "Iced · tall glass",
    body: "Huila beans steeped for eighteen hours, poured over hand-cut ice and dry tonic with a twist of orange peel. Our summer obsession.",
    notes: ["Cacao", "Orange", "Quinine"],
  },
];

const ORIGINS = [
  {
    place: "Haraz",
    country: "Yemen",
    body: "Terraced at 2,200 m and sun-dried in the cherry for a jammy sweetness. The heart of our qahwa.",
    altitude: "2,200 m",
    process: "Natural",
    roast: "Light roast",
    tone: "bg-ember",
    // terrace profile for the little line drawing
    ridge: "M0 70 L20 70 L20 58 L42 58 L42 46 L64 46 L64 34 L86 34 L86 22 L108 22 L108 14 L160 14",
  },
  {
    place: "Guji",
    country: "Ethiopia",
    body: "Heirloom varietals from smallholder gardens, washed and dried slowly on raised beds.",
    altitude: "1,950 m",
    process: "Washed",
    roast: "Light roast",
    tone: "bg-cardamom",
    ridge: "M0 70 C30 60 40 30 70 28 S110 50 130 30 S150 20 160 22",
  },
  {
    place: "Huila",
    country: "Colombia",
    body: "Caturra and Castillo from a family farm in the Andean south: chocolate-heavy and generous with milk.",
    altitude: "1,750 m",
    process: "Washed",
    roast: "Medium roast",
    tone: "bg-walnut",
    ridge: "M0 70 L30 40 L48 54 L80 18 L104 46 L124 32 L160 60",
  },
];

const BAGS = [
  { name: "Haraz Natural", price: "14.00", notes: "Jammy, cocoa, dried apricot", color: "#9a3d1c", label: "#f2e5cf" },
  { name: "Guji Washed", price: "15.50", notes: "Peach, jasmine, black tea", color: "#4e6a3d", label: "#f7efe2" },
  { name: "Qahwa Blend", price: "12.00", notes: "Pre-spiced with green cardamom and saffron", color: "#c98a26", label: "#2a1b12" },
];

const HOURS = [
  { days: "Monday – Thursday", time: "7:00 – 19:00" },
  { days: "Friday", time: "8:00 – 22:00" },
  { days: "Saturday – Sunday", time: "8:00 – 20:00" },
];

const container = "mx-auto w-full max-w-[1200px] px-4 sm:px-8";

export default function Home() {
  return (
    <>
      <Header />
      <main id="main" tabIndex={-1} className="outline-none">
        <Stage>
          {/* ---------------------------------------------------------- hero */}
          <section id="top" aria-labelledby="hero-title" className="relative flex min-h-[100svh] items-end min-[900px]:items-center">
            <div className="over-canvas w-full pb-12 pt-24 min-[900px]:pb-0 min-[900px]:pt-16">
              <div className={container}>
                <div className="max-w-[560px]">
                  <p className="eyebrow rise text-saffron">Specialty coffee · Old Port District</p>
                  <h1 id="hero-title" className="display-xl rise rise-2 mt-4 text-crema">
                    Poured slowly.
                    <br />
                    <em className="font-normal italic text-saffron">Shared generously.</em>
                  </h1>
                  <p className="rise rise-3 mt-6 max-w-[46ch] text-lg leading-relaxed text-sand">
                    Qahwa House roasts single-origin beans in small batches and serves them two ways: the
                    cardamom-and-saffron qahwa of our grandmothers, and the precise pour-overs of the modern bar.
                    Pull up a cushion.
                  </p>
                  <div className="rise rise-4 mt-8 flex flex-wrap gap-3">
                    <a href="#menu" className="btn btn-primary">
                      Explore the menu
                    </a>
                    <a href="#visit" className="btn btn-ghost">
                      Plan a visit
                    </a>
                  </div>
                  <p className="mt-10 hidden items-center gap-3 text-sm text-sand min-[900px]:flex">
                    <span className="scroll-cue inline-block h-8 w-[1.5px] bg-saffron" aria-hidden="true" />
                    Scroll to turn the tray
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ---------------------------------------------------------- menu */}
          <section id="menu" aria-labelledby="menu-title" className="relative scroll-mt-16">
            <div className="flex min-h-[70svh] items-end min-[900px]:items-center">
              <div className="over-canvas w-full pb-10 pt-24">
                <div className={container}>
                  <div className="max-w-[520px]">
                    <p className="eyebrow text-saffron">The menu</p>
                    <h2 id="menu-title" className="display-lg mt-3 text-crema">
                      The tray turns. Pick a cup.
                    </h2>
                    <p className="mt-5 text-lg text-sand">
                      Four drinks we would order for ourselves. Each one is poured fresh the moment it reaches the front.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <ol className="list-none">
              {MENU.map((item, i) => (
                <li
                  key={item.name}
                  data-menu-item
                  data-active={i === 0}
                  className="menu-item flex min-h-[88svh] items-end min-[900px]:items-center"
                >
                  <article className="over-canvas w-full pb-12 pt-20 min-[900px]:py-0" aria-labelledby={`drink-${i}`}>
                    <div className={container}>
                      <div className="max-w-[500px]">
                        <div className="flex items-baseline gap-4">
                          <span className="font-display text-5xl font-light text-saffron sm:text-6xl" aria-hidden="true">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="h-px flex-1 bg-walnut" aria-hidden="true" />
                          <span className="font-display text-2xl text-crema">
                            <span className="sr-only">Price: </span>
                            {item.price}
                          </span>
                        </div>
                        <h3 id={`drink-${i}`} className="display-md mt-4 text-crema">
                          {item.name}
                        </h3>
                        <p className="mt-1 text-sm font-semibold uppercase tracking-[0.12em] text-saffron">{item.serve}</p>
                        <p className="mt-4 text-base leading-relaxed text-sand sm:text-lg">{item.body}</p>
                        <ul className="mt-5 flex flex-wrap gap-2" aria-label="Tasting notes">
                          {item.notes.map((n) => (
                            <li key={n} className="rounded-full border border-walnut px-3 py-1 text-sm text-crema">
                              {n}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </article>
                </li>
              ))}
            </ol>
            <div className="h-[12svh]" aria-hidden="true" />
          </section>
        </Stage>

        {/* --------------------------------------------------------- origins */}
        <section id="origins" aria-labelledby="origins-title" className="on-light scroll-mt-16 bg-foam text-ink">
          <div className={`${container} py-[var(--section-y)]`}>
            <div className="grid gap-6 md:grid-cols-[1fr_1.1fr] md:items-end">
              <div>
                <p className="eyebrow text-ember">Origins</p>
                <h2 id="origins-title" className="display-lg mt-3">
                  Three farms, one roaster.
                </h2>
              </div>
              <p className="text-lg text-ink-soft">
                We buy directly from growers we have visited, pay well above the commodity price, and roast every
                Tuesday and Friday in a five-kilo drum behind the counter.
              </p>
            </div>
            <ul className="mt-12 grid list-none gap-6 md:grid-cols-3">
              {ORIGINS.map((o) => (
                <li key={o.place} className="flex flex-col overflow-hidden rounded-[20px] border border-[#e2d3bb] bg-[#fbf6ee]">
                  <div className={`arch mx-4 mt-4 ${o.tone} px-6 pb-6 pt-12 text-crema`}>
                    <svg viewBox="0 0 160 80" className="h-16 w-full" aria-hidden="true">
                      <path d={o.ridge} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" opacity="0.85" />
                    </svg>
                    <p className="mt-3 font-display text-4xl font-light">{o.altitude}</p>
                    <p className="text-sm">above sea level</p>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="display-md">
                      {o.place}, <span className="text-ink-soft">{o.country}</span>
                    </h3>
                    <p className="mt-3 flex-1 text-ink-soft">{o.body}</p>
                    <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-[#e2d3bb] pt-4 text-sm">
                      <div>
                        <dt className="font-semibold text-ember">Process</dt>
                        <dd>{o.process}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-ember">Roast</dt>
                        <dd>{o.roast}</dd>
                      </div>
                    </dl>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ------------------------------------------------------- the house */}
        <section id="house" aria-labelledby="house-title" className="scroll-mt-16 bg-roast">
          <div className={`${container} grid gap-12 py-[var(--section-y)] lg:grid-cols-[1.05fr_1fr] lg:gap-16`}>
            <div>
              <p className="eyebrow text-saffron">The House</p>
              <h2 id="house-title" className="display-lg mt-3 text-crema">
                A majlis for slow mornings.
              </h2>
              <p className="mt-6 max-w-[52ch] text-lg text-sand">
                Low brass tables, woven cushions and a long walnut bar where you can watch every cup being made. There
                is no Wi-Fi password on the wall — ask the barista, and stay as long as you like.
              </p>
              <dl className="mt-10 grid grid-cols-3 gap-4 border-y border-walnut py-6">
                {[
                  ["2019", "Opened"],
                  ["38", "Seats"],
                  ["On site", "Roasted"],
                ].map(([v, k]) => (
                  <div key={k} className="flex flex-col-reverse">
                    <dt className="mt-1 text-sm text-sand">{k}</dt>
                    <dd className="font-display text-2xl text-crema sm:text-3xl">{v}</dd>
                  </div>
                ))}
              </dl>
              <figure className="arch mt-10 flex max-w-[360px] flex-col items-center border border-walnut bg-espresso px-6 pb-8 pt-14 text-center">
                <p lang="ar" className="font-arabic text-4xl text-saffron">
                  أهلاً وسهلاً
                </p>
                <figcaption className="mt-3 text-sm text-sand">
                  <em>Ahlan wa sahlan</em> — you are among family. The first words you will hear at the door.
                </figcaption>
              </figure>
            </div>
            <div className="lg:pt-16">
              <h3 className="display-md text-crema">How we pour qahwa</h3>
              <ol className="mt-8 list-none space-y-0">
                {[
                  "We pour with the left hand and offer the cup with the right.",
                  "Your finjan is filled only a third of the way, so every sip is hot.",
                  "When you have had enough, give the cup a gentle shake from side to side.",
                ].map((step, i) => (
                  <li key={i} className="flex gap-6 border-t border-walnut py-7 last:border-b">
                    <span className="font-display text-4xl font-light leading-none text-saffron" aria-hidden="true">
                      {i + 1}
                    </span>
                    <p className="pt-1 text-lg text-crema">{step}</p>
                  </li>
                ))}
              </ol>
              <div className="star-rule mt-10" aria-hidden="true" />
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------- beans to go */}
        <section id="beans" aria-labelledby="beans-title" className="on-light scroll-mt-16 bg-foam text-ink">
          <div className={`${container} py-[var(--section-y)]`}>
            <div className="max-w-[640px]">
              <p className="eyebrow text-cardamom">Beans to go</p>
              <h2 id="beans-title" className="display-lg mt-3">
                Take the house home.
              </h2>
              <p className="mt-5 text-lg text-ink-soft">
                Freshly roasted 250 g bags, ground to order for your brewer or left whole. Subscribers get a bag every
                two weeks, roasted no more than three days before it leaves the shop.
              </p>
            </div>
            <ul className="mt-12 grid list-none gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {BAGS.map((b) => (
                <li key={b.name} className="rounded-[20px] border border-[#e2d3bb] bg-[#fbf6ee] p-6">
                  <div className="flex h-56 items-end justify-center rounded-2xl bg-[#efe3cf]" aria-hidden="true">
                    {/* a coffee bag, drawn in CSS */}
                    <div className="relative mb-6 h-40 w-28 rounded-b-md rounded-t-sm shadow-lg" style={{ background: b.color }}>
                      <div className="absolute inset-x-0 top-0 h-5 rounded-t-sm bg-black/20" />
                      <div
                        className="absolute inset-x-3 top-12 rounded-sm px-2 py-3 text-center"
                        style={{ background: b.label, color: b.color }}
                      >
                        <span className="block font-display text-[11px] font-semibold leading-tight">Qahwa House</span>
                        <span className="mt-1 block text-[9px] uppercase tracking-widest">250 g</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 flex items-baseline justify-between gap-4">
                    <h3 className="display-md">{b.name}</h3>
                    <p className="font-display text-xl">
                      <span className="sr-only">Price: </span>
                      {b.price}
                    </p>
                  </div>
                  <p className="mt-2 text-ink-soft">{b.notes}</p>
                </li>
              ))}
            </ul>
            <div className="mt-10">
              <a href="#visit" className="btn btn-dark">
                Ask about subscriptions
              </a>
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------- visit */}
        <section id="visit" aria-labelledby="visit-title" className="scroll-mt-16 bg-espresso">
          <div className={`${container} grid gap-12 py-[var(--section-y)] md:grid-cols-2`}>
            <div>
              <p className="eyebrow text-saffron">Visit</p>
              <h2 id="visit-title" className="display-lg mt-3 text-crema">
                Find the house.
              </h2>
              <address className="mt-6 font-display text-2xl not-italic text-crema">
                14 Saffron Lane
                <br />
                Old Port District
              </address>
              <p className="mt-6 max-w-[46ch] text-sand">
                Roasting days are Tuesday and Friday mornings — the whole street smells like it. Walk-ins only, except
                the majlis room for up to ten guests: ask at the bar.
              </p>
              {/* a little code-drawn street plan */}
              <svg viewBox="0 0 320 160" className="mt-8 w-full max-w-[420px]" role="img" aria-label="Street plan: Qahwa House on the corner of Saffron Lane and the harbour road">
                <rect width="320" height="160" rx="16" fill="#2a1b12" />
                <path d="M0 112 H320" stroke="#4a2f1e" strokeWidth="18" />
                <path d="M196 0 V160" stroke="#4a2f1e" strokeWidth="14" />
                <path d="M40 0 C60 60 20 100 60 160" stroke="#3a2618" strokeWidth="8" fill="none" />
                <path d="M0 146 C80 136 240 156 320 140" stroke="#33506b" strokeWidth="10" fill="none" opacity="0.7" />
                <circle cx="214" cy="90" r="9" fill="#e3a53c" />
                <circle cx="214" cy="90" r="18" fill="none" stroke="#e3a53c" strokeOpacity="0.4" strokeWidth="2" />
                <text x="232" y="74" fill="#f2e5cf" fontSize="12" fontFamily="sans-serif">Qahwa House</text>
                <text x="10" y="104" fill="#cdb89a" fontSize="10" fontFamily="sans-serif">Saffron Lane</text>
              </svg>
            </div>
            <div className="md:pt-20">
              <h3 className="display-md text-crema">Opening hours</h3>
              <dl className="mt-6">
                {HOURS.map((h) => (
                  <div key={h.days} className="flex justify-between gap-4 border-t border-walnut py-4 last:border-b">
                    <dt className="text-sand">{h.days}</dt>
                    <dd className="font-semibold text-crema">{h.time}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-8 rounded-2xl border border-walnut bg-roast p-6">
                <p className="font-display text-xl text-crema">Coming with a group?</p>
                <p className="mt-2 text-sand">
                  The majlis room seats ten around one low table, with a dallah of qahwa and a plate of dates to start.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ------------------------------------------------------------ footer */}
      <footer className="border-t border-walnut bg-espresso">
        <div className={`${container} flex flex-col gap-8 py-12 md:flex-row md:items-end md:justify-between`}>
          <div>
            <p className="font-display text-3xl text-crema">
              Qahwa House{" "}
              <span lang="ar" className="font-arabic text-saffron" aria-hidden="true">
                قهوة
              </span>
            </p>
            <p className="mt-2 text-sm text-sand">Concept project — fictional brand.</p>
            <p className="mt-1 text-sm text-sand">© 2026 Alhassan Alfarran</p>
          </div>
          <div className="flex flex-col gap-3 text-sm text-sand md:items-end">
            <p>
              Design &amp; development by{" "}
              <a className="inline-flex min-h-11 items-center font-semibold text-crema underline underline-offset-4" href="https://alhassan-portfolio-sigma.vercel.app">
                Alhassan Alfarran
              </a>
            </p>
            <div className="flex flex-wrap gap-2">
              <a className="btn btn-ghost min-h-11 px-4 py-2 text-sm" href="https://github.com/kyan9400">
                GitHub
              </a>
              <MotionToggle className="btn btn-ghost min-h-11 px-4 py-2 text-sm" />
            </div>
          </div>
        </div>
      </footer>
      <MotionToast />
    </>
  );
}
