# Qahwa House — Specialty coffee, poured slowly

A concept website for **Qahwa House**, a fictional specialty coffee house in a fictional Old Port District. A walnut
tray of four drinks sits behind the hero and the menu in real-time 3D: as you scroll, the tray turns each drink to the
front and it is poured live, with steam rising and coffee beans orbiting the cup.

Live: https://qahwa-house-3d.vercel.app

> Concept project — fictional brand.

## Signature 3D technique — "the turning tray"
- **Lathe-geometry vessels.** A stoneware latte cup with handle and saucer, a finjan with dates, a glass tumbler and a
  tall cold-brew glass with ice — each spun from a hand-written 2D profile (`LatheGeometry`), with glaze bands painted
  into a tiny canvas strip texture mapped along the profile.
- **Live pour.** A thin open cylinder with a custom shader (flowing bands, fresnel edge) falls into the front vessel,
  the liquid surface rises with an ease-out curve and follows the inner wall's radius, ripples run across it, and the
  latte finishes with a canvas-drawn rosetta that blooms in.
- **GPU steam.** `THREE.Points` whose whole life (rise, curl drift, growth, fade) is computed in the vertex shader from
  one time uniform — zero CPU updates per frame.
- **Orbiting beans.** One `InstancedMesh` of displaced-ellipsoid beans circles the front cup in the hero and widens to
  circle the whole tray in the menu, updated with reused objects.
- **Lighting without downloads.** Hemisphere, key and rim lights plus a small environment map baked once with
  `PMREMGenerator` from glowing panels built in code (no HDRI, no CDN).
- **Performance rules applied:** render on demand (the loop only runs while something moves, the stage is on screen and
  the tab is visible), a GPU quality tier chosen before the canvas exists, an idle-aware adaptive pixel ratio, one
  scroll smoothing step in the render loop, `compileAsync` warm-up behind the SVG poster, no per-frame allocations,
  reduced motion by default when the OS asks with a "Turn on full motion" toggle, and a designed SVG poster when WebGL
  is missing, the context is lost or the GPU is a software renderer (SwiftShader, llvmpipe, ...). Append `?quality=low|medium|high` or `?motion=full|reduced` to test.

## Tech stack
Next.js 16 (App Router, TypeScript, `src/`), React 19, three.js 0.186 + @react-three/fiber 9, Tailwind CSS 4.
The 3D scene is a client component loaded with `next/dynamic(..., { ssr: false })` only after window `load` and an
idle callback, so the HTML (hero headline and lede included, with no intro animation) renders instantly. A cheap GPU
probe (a throwaway WebGL context, no three.js) runs first: software renderers keep the poster and never download the
3D chunk (`?quality=` forces it on). Geometry, painted textures, the environment bake and the shader compile each run
in their own task, yielding to the browser in between.

Versions are pinned exactly as in the shared stack file. Deliberate differences: `@react-three/drei`, `gsap`/`@gsap/react`,
`lenis` and `@react-three/postprocessing` are not installed. Native scroll with one damping step inside the render loop
is the only smoothing layer; a small custom adaptive-resolution controller replaces drei's `PerformanceMonitor` (which
misreads the idle gaps of on-demand rendering); and the lighting environment is baked in code with PMREM instead of
drei's `<Environment>`. This keeps the 3D chunk smaller.

## Project layout
```
src/app/          layout, page, 404, globals.css (design tokens), icon.svg, OG image, robots, sitemap
src/components/   Stage (sticky 3D layer + scroll controller), Poster, Header, MotionToggle, MotionToast
src/three/        Experience (Canvas + tier), World (scene, frame loop), geometry, shaders, textures
src/lib/          quality tiers, motion preference, shared stage store
SPEC.md           design spec: concept, copy, palette, budget
```

## Run it
```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
npm run lint
```

## Credits
Fonts: Fraunces, Manrope and Reem Kufi (SIL OFL 1.1). Libraries: see [CREDITS.md](CREDITS.md). All 3D, textures,
illustrations, favicon and social image are made in code for this project.

## Copyright
© 2026 Alhassan Alfarran. All rights reserved — see [LICENSE](LICENSE).
