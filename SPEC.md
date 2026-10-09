# Qahwa House — site spec

## Concept
Qahwa House is a fictional specialty coffee house in a fictional "Old Port District". It sits between two traditions:
the cardamom-and-saffron *qahwa* poured from a dallah into a small finjan, and the precise pour-over of the
modern specialty bar. The site should feel like stepping into a warm, low-lit majlis: deep espresso browns,
crema and saffron light, generous serif type, calm motion.

**Audience:** people who look up a café before walking over (mobile, on the go), coffee nerds who care about
origin and roast, and — as a portfolio piece — studios and clients evaluating real-time 3D craft.

**Tone of voice:** warm, specific, unhurried. Concrete details (altitudes, temperatures, roast days), no hype words.

## Sections (6)
1. **Hero / stage** — sticky 3D stage: the house cup is poured live, steam rises, coffee beans orbit.
2. **Menu** — scrolling through four drinks turns a walnut tray; each drink rotates to the front and is poured.
3. **Origins** — three farms, roast data.
4. **The House** — the space, and the qahwa serving ritual.
5. **Beans to go** — retail bags and subscription.
6. **Visit** — address, hours, roasting days. Footer with credits, motion toggle, disclaimer.

Also: custom 404 ("This cup is empty"), skip link, motion toast.

## Signature 3D moment — "The turning tray"
One `<Canvas>` lives in a sticky, full-viewport layer behind sections 1–2.

**Scene (all geometry made in code):**
- A round walnut tray (cylinder + lathe rim) with a canvas-generated wood-ring texture.
- Four vessels on the tray at 90° steps, each a `LatheGeometry` from a hand-written profile (outer wall, lip, inner wall):
  stoneware latte cup + torus-arc handle + saucer; handleless finjan + saucer + two dates; straight glass tumbler
  (transparent); tall cold-brew glass with instanced ice cubes.
- Liquid: an inner-profile lathe body (for glass vessels) and a surface disc whose radius follows the inner profile at the
  current fill level. The latte surface uses a canvas-drawn crema rosetta texture. A ripple shader runs on the surface
  while pouring.
- **Live pour:** a thin open cylinder with a custom shader (scrolling flow bands, fresnel edge, tapered radius) falls from
  above the frame into the front vessel; the fill level rises with an ease-out curve; the stream thins and retracts.
  Every time a new drink reaches the front, it is poured.
- **Steam:** `THREE.Points` with a custom shader — each particle has a seed; position is computed in the vertex shader
  from `uTime` (rise, curl drift, fade, grow), so there are zero CPU updates per frame. Hot drinks only.
- **Beans:** one `InstancedMesh` — an ellipsoid with a vertex-displaced centre crease — orbiting the front cup on tilted
  rings in the hero, widening to circle the whole tray in the menu. Matrices are updated with reused objects.
- **Camera:** scroll progress through the hero moves the camera from a close, low hero shot to a three-quarter view of the
  tray. Scroll progress through the menu sets the tray's target angle; one damping step in `useFrame` eases toward it
  (native scroll, no Lenis, so a single smoothing layer).
- Lighting: hemisphere + key + rim lights, plus an environment map baked once with `PMREMGenerator` from code-made light panels (no
  HDRI downloads, no drei) for glaze reflections on medium/high. Blob shadows are canvas-generated radial textures.

**Quality tiers** (decided before the Canvas exists — GPU probe via `WEBGL_debug_renderer_info`, touch devices capped at
medium, software renderers → low, `?quality=` override):

| | high | medium | low |
|---|---|---|---|
| DPR cap | 2 | 1.5 | 1 |
| MSAA | on | on | off |
| Steam particles | 260 | 150 | 60 |
| Beans | 42 | 28 | 14 |
| Baked environment map | 256 px | 128 px | off (lights only) |
| Lathe segments | 96 | 64 | 40 |

A small custom adaptive-resolution controller (measures only consecutive drawn frames, so on-demand idle gaps are not
mistaken for slow frames) lowers the DPR in steps when frame rate declines.

**Render on demand:** `frameloop="demand"`. A driver component invalidates every frame only while something autonomous
is running (steam/beans in full motion, a pour, or the tray still damping) AND the stage is on screen AND the tab is
visible. Otherwise nothing renders.

**Warm-up:** the stage shows the SVG poster with a quiet loader until `gl.compileAsync(scene, camera)` resolves and the
first frame is drawn; then the canvas fades in (opacity only).

**Reduced motion** (default when the OS asks; "Turn on full motion" toggle, remembered in localStorage, `?motion=full`
override): no orbiting beans (resting on the tray), steam frozen as a still wisp, no pour animation (vessels shown full),
camera and tray *cut* to their scroll positions instead of sweeping.

**No WebGL / context lost:** a designed inline SVG poster of the cup, saucer, steam and beans in the same palette.
The page stays fully usable — the menu text carries all information.

## Design system

### Palette
| token | hex | use |
|---|---|---|
| `espresso` | `#1A110B` | page background (dark sections) |
| `roast` | `#2A1B12` | raised panels, text on light |
| `walnut` | `#4A2F1E` | borders, tray |
| `crema` | `#F2E5CF` | primary text on dark |
| `foam` | `#F7EFE2` | light section background |
| `sand` | `#CDB89A` | secondary text on dark (≈9:1 on espresso) |
| `saffron` | `#E3A53C` | accent, buttons (espresso text on it ≈ 9:1) |
| `ember` | `#9A3D1C` | accent on light (≈6.5:1 on foam) |
| `cardamom` | `#4E6A3D` | secondary accent on light (≈5:1 on foam) |

### Fonts (Google Fonts, SIL OFL, self-hosted via `next/font`)
- **Fraunces** — display serif (headings, prices), variable weight, soft optical style.
- **Manrope** — body and UI.
- **Reem Kufi** — the single Arabic word قهوة in the logo and hero ornament (arabic subset only).

### Spacing scale (4 px base)
`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128` px. Section padding: 96 px desktop / 64 px mobile. Content max width
1200 px, 16 px gutter at phone width. Type scale: 14 / 16 / 18 / 22 / 28 / 40 / 56 / 80 px (fluid with `clamp`).

### Components
Pill buttons (min-height 48 px), hairline walnut dividers, numbered menu rows with oversized Fraunces numerals,
an arched "window" frame motif (CSS border-radius top) for cards, visible 3 px saffron focus ring.

## Final copy

**Header:** Qahwa House · قهوة — nav: Menu, Origins, The House, Visit.

**Hero**
- Eyebrow: Specialty coffee · Old Port District
- H1: Poured slowly. Shared generously.
- Body: Qahwa House roasts single-origin beans in small batches and serves them two ways: the cardamom-and-saffron
  qahwa of our grandmothers, and the precise pour-overs of the modern bar. Pull up a cushion.
- Buttons: Explore the menu · Plan a visit
- Hint: Scroll to turn the tray

**Menu** — H2: The tray turns. Pick a cup. Intro: Four drinks we would order for ourselves. Each one is poured fresh the
moment it reaches the front.
1. **Saffron Cardamom Latte** — 5.80 — Hot · stoneware cup, 240 ml — A double ristretto of our Haraz house roast,
   steamed whole or oat milk, a thread of saffron and green cardamom crushed to order. Notes: honey, saffron, warm spice.
2. **Qahwa Saada** — 4.50 — Hot · finjan, refilled until you shake the cup — The traditional welcome. Lightly roasted
   Yemeni beans simmered with cardamom, clove and a pinch of saffron, poured from the dallah and served with dates.
   Notes: bright, floral, cardamom.
3. **Guji Pour-Over** — 6.20 — Hot · glass, 300 ml — Washed Ethiopian heirloom from the Guji highlands, brewed by hand on
   a cone filter at 93 °C. Tea-like body with stone fruit and jasmine. Notes: peach, jasmine, bergamot.
4. **Cold Brew Tonic** — 6.00 — Iced · tall glass — Huila beans steeped for eighteen hours, poured over hand-cut ice and
   dry tonic with a twist of orange peel. Our summer obsession. Notes: cacao, orange, quinine.

**Origins** — H2: Three farms, one roaster. Intro: We buy directly from growers we have visited, pay well above the
commodity price, and roast every Tuesday and Friday in a five-kilo drum behind the counter.
- Haraz, Yemen — Terraced at 2,200 m and sun-dried in the cherry for a jammy sweetness. The heart of our qahwa.
  2,200 m · Natural · Light roast
- Guji, Ethiopia — Heirloom varietals from smallholder gardens, washed and dried slowly on raised beds.
  1,950 m · Washed · Light roast
- Huila, Colombia — Caturra and Castillo from a family farm in the Andean south: chocolate-heavy and generous with milk.
  1,750 m · Washed · Medium roast

**The House** — H2: A majlis for slow mornings. Body: Low brass tables, woven cushions and a long walnut bar where you can
watch every cup being made. There is no Wi-Fi password on the wall — ask the barista, and stay as long as you like.
Facts: Opened 2019 · 38 seats · Roasted on site. Sub-heading: How we pour qahwa —
1. We pour with the left hand and offer the cup with the right.
2. Your finjan is filled only a third of the way, so every sip is hot.
3. When you have had enough, give the cup a gentle shake from side to side.

**Beans to go** — H2: Take the house home. Body: Freshly roasted 250 g bags, ground to order for your brewer or left whole.
Subscribers get a bag every two weeks, roasted no more than three days before it leaves the shop.
- Haraz Natural — 14.00 — jammy, cocoa, dried apricot
- Guji Washed — 15.50 — peach, jasmine, black tea
- Qahwa Blend — 12.00 — pre-spiced with green cardamom and saffron
Button: Ask about subscriptions (→ Visit).

**Visit** — H2: Find the house. 14 Saffron Lane, Old Port District. Hours: Mon–Thu 7:00–19:00 · Fri 8:00–22:00 ·
Sat–Sun 8:00–20:00. Roasting days: Tuesday and Friday mornings — the whole street smells like it. Walk-ins only, except the
majlis room for up to ten guests: ask at the bar.

**Footer:** Qahwa House · Concept project — fictional brand. · © 2026 Alhassan Alfarran · Design & development by
Alhassan Alfarran (portfolio, GitHub) · motion toggle.

**404:** H1: This cup is empty. Body: The page you were looking for has been cleared from the table. Button: Back to the house.

## Assets & licenses
- 3D: 100 % procedural code (lathe/torus/cylinder/instanced geometry, custom shaders).
- Textures: generated at runtime on `<canvas>` (wood rings, crema rosetta, blob shadow, soft particle sprite in shader).
- Poster, favicon (`app/icon.svg`) and OG image (`next/og` `ImageResponse`): drawn in code.
- Fonts: Fraunces, Manrope, Reem Kufi — SIL Open Font License 1.1, via `next/font/google`.
- No external images, models, HDRIs or audio. No runtime CDN requests.

## Performance budget
- First-load JS for `/` < 250 KB gzip excluding the lazy 3D chunk (target ≈ 150 KB).
- Lazy 3D chunk (three + fiber + scene) loaded after hydration via `next/dynamic` `ssr:false`.
- Zero image requests above the fold (SVG poster is inline). Fonts: 3 families, `display: swap`, Arabic subset only for Reem Kufi.
- Draw calls < 40; triangles < 120k on high, < 50k on low; no shadow maps; no post-processing.
- Lighthouse mobile ≥ 85 performance, ≥ 95 accessibility / best practices / SEO.
