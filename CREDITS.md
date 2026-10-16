# Credits

The 3D tray with its brass rim and handles, the brass dallah, the four lathe-geometry vessels, the dates and cardamom,
the pour, steam and beans, the painted crema / glaze-speckle / table / shadow / glow textures, the no-WebGL poster, the
street plan, the favicon, and the Open Graph / Twitter preview image (a screenshot of this site) are made in code for
this project and are covered by the repository's LICENSE. The real scanned objects and the walnut veneer listed under
"CC0 assets" below are bundled in `public/models/` and served from this site's own domain; nothing is fetched from a
third-party CDN at runtime.

## Fonts (SIL Open Font License 1.1, self-hosted at build time via `next/font/google`)
- **Fraunces** — Undercase Type (Phaedra Charles, Flavia Zimbardi) — https://fonts.google.com/specimen/Fraunces
- **Manrope** — Mikhail Sharanda — https://fonts.google.com/specimen/Manrope
- **Reem Kufi** — Khaled Hosny, Santiago Orozco — https://fonts.google.com/specimen/Reem+Kufi

## npm libraries
| package | license |
|---|---|
| next | MIT |
| react, react-dom | MIT |
| three | MIT |
| @react-three/fiber | MIT |
| tailwindcss, @tailwindcss/postcss | MIT |
| typescript | Apache-2.0 |
| eslint, eslint-config-next | MIT |
| @types/* | MIT |

## CC0 assets (Poly Haven, CC0 1.0 public domain — https://polyhaven.com/license)
Photogrammetry scans, converted to meshopt-compressed glTF binaries with 1024 px WebP textures
(`@gltf-transform/cli optimize --compress meshopt --texture-compress webp --texture-size 1024`).

| file in `public/models/` | asset | author | source |
|---|---|---|---|
| `brass_pot_01.glb` | Brass Pot 01 | Rico Cilliers | https://polyhaven.com/a/brass_pot_01 |
| `carved_wooden_plate.glb` | Carved Wooden Plate | Jan Martens | https://polyhaven.com/a/carved_wooden_plate |
| `ceramic_pot.glb` | Ceramic Pot | Aron Łyczek | https://polyhaven.com/a/ceramic_pot |
| `walnut_veneer_diff.webp`, `walnut_veneer_rough.webp` | Walnut Veneer (texture, 1k colour + roughness) | Poly Haven | https://polyhaven.com/a/walnut_veneer |
