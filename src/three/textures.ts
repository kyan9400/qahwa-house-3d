import * as THREE from "three";

/* All textures are painted at runtime on a <canvas>. No image files. */

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  return { c, ctx };
}

function toTexture(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

/** Deterministic random so the painted textures look the same on every visit. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Walnut tray top: plank grain with gentle waves and a few darker figure lines.
    Returns the colour map and a matching roughness map (the darker grain lines are a little rougher). */
export function woodTexture(size: number) {
  const { c, ctx } = canvas(size, size);
  const r = rng(7);
  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, "#5a3722");
  g.addColorStop(0.5, "#4a2c1b");
  g.addColorStop(1, "#3d2416");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const lines = Math.round(size / 3);
  for (let i = 0; i < lines; i++) {
    const y0 = (i / lines) * size + r() * 3;
    const amp = 2 + r() * 6;
    const freq = 0.004 + r() * 0.01;
    const phase = r() * 10;
    ctx.beginPath();
    for (let x = 0; x <= size; x += 8) {
      const y = y0 + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 3.1 + phase) * amp * 0.25;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    const dark = r() < 0.18;
    ctx.strokeStyle = dark ? `rgba(30,16,8,${0.25 + r() * 0.25})` : `rgba(${r() < 0.5 ? "120,80,50" : "40,22,12"},${0.08 + r() * 0.12})`;
    ctx.lineWidth = dark ? 1.4 + r() * 1.6 : 0.6 + r() * 1.2;
    ctx.stroke();
  }
  // soft polish highlight
  const hl = ctx.createRadialGradient(size * 0.35, size * 0.3, 0, size * 0.35, size * 0.3, size * 0.7);
  hl.addColorStop(0, "rgba(255,220,170,0.10)");
  hl.addColorStop(1, "rgba(255,220,170,0)");
  ctx.fillStyle = hl;
  ctx.fillRect(0, 0, size, size);
  const map = toTexture(c);

  // roughness pass: drawn from the colour canvas at half size, luminance -> roughness (0.32 .. 0.7)
  const half = Math.max(64, size >> 1);
  const rough = canvas(half, half);
  rough.ctx.drawImage(c, 0, 0, half, half);
  const img = rough.ctx.getImageData(0, 0, half, half);
  const d = img.data;
  for (let k = 0; k < d.length; k += 4) {
    const lum = (d[k] * 0.3 + d[k + 1] * 0.59 + d[k + 2] * 0.11) / 255;
    const v = Math.round(255 * Math.min(0.7, Math.max(0.32, 0.78 - lum * 1.4)));
    d[k] = d[k + 1] = d[k + 2] = v;
  }
  rough.ctx.putImageData(img, 0, 0);
  return { map, rough: toTexture(rough.c, false) };
}

/** Grey roughness value with fine noise and wrapped speckles; tiles in both directions. Also used as a bump map. */
function paintSpeckle(ctx: CanvasRenderingContext2D, w: number, h: number, base: number, seed: number) {
  const r = rng(seed);
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let k = 0; k < d.length; k += 4) {
    const v = Math.round(255 * Math.min(1, Math.max(0, base + (r() - 0.5) * 0.06)));
    d[k] = d[k + 1] = d[k + 2] = v;
    d[k + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  // iron speckles in the glaze, drawn with wrapped copies so the texture tiles seamlessly
  const dots = Math.round((w * h) / 260);
  for (let i = 0; i < dots; i++) {
    const x = r() * w;
    const y = r() * h;
    const rad = 0.5 + r() * 1.3;
    const shade = r() < 0.7 ? base + 0.18 : base - 0.12;
    ctx.fillStyle = `rgba(${Math.round(255 * shade)},${Math.round(255 * shade)},${Math.round(255 * shade)},0.8)`;
    for (const ox of [0, x < 3 ? w : x > w - 3 ? -w : 0]) {
      for (const oy of [0, y < 3 ? h : y > h - 3 ? -h : 0]) {
        ctx.beginPath();
        ctx.arc(x + ox, y + oy, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

/** Stoneware speckle + micro-noise (tiling, linear data): roughness = material.roughness * value (avg `base`). */
export function speckleTexture(size: number, base = 0.5) {
  const { c, ctx } = canvas(size, size);
  paintSpeckle(ctx, size, size, base, 23);
  const t = toTexture(c, false);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/**
  Roughness/bump map for the latte cup body, laid out along the lathe's v like the colour strip:
  speckled glaze at `glaze` roughness, and the unglazed foot (v < footV) at 0.9.
*/
export function glazeRoughTexture(footV: number, glaze = 0.38) {
  const w = 256;
  const h = 512;
  const { c, ctx } = canvas(w, h);
  paintSpeckle(ctx, w, h, glaze, 31);
  // canvas y = 0 is v = 1 (flipY): the foot band is at the bottom of the canvas
  const band = Math.min(h - 1, Math.max(0, Math.round((1 - footV) * h)));
  const r = rng(37);
  const img = ctx.getImageData(0, band, w, h - band);
  const d = img.data;
  for (let k = 0; k < d.length; k += 4) {
    const v = Math.round(255 * (0.9 + (r() - 0.5) * 0.08));
    d[k] = d[k + 1] = d[k + 2] = v;
  }
  ctx.putImageData(img, 0, band);
  const t = toTexture(c, false);
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

/** Crema with a rosetta of steamed milk, as seen from above. */
export function cremaTexture(size: number) {
  const { c, ctx } = canvas(size, size);
  const h = size / 2;
  const base = ctx.createRadialGradient(h, h, 0, h, h, h);
  base.addColorStop(0, "#c58a52");
  base.addColorStop(0.7, "#a8693a");
  base.addColorStop(0.92, "#7d4523");
  base.addColorStop(1, "#5e3118");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  // speckles of crema
  const r = rng(11);
  for (let i = 0; i < size * 2; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * h * 0.95;
    ctx.fillStyle = `rgba(${r() < 0.5 ? "90,45,20" : "220,170,110"},${0.08 + r() * 0.1})`;
    ctx.beginPath();
    ctx.arc(h + Math.cos(a) * d, h + Math.sin(a) * d, 0.6 + r() * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // rosetta: stacked leaves shrinking toward the top, then a pulled-through stem
  ctx.save();
  ctx.translate(h, h * 1.04);
  const milk = "#f4e7d2";
  ctx.shadowColor = "rgba(120,70,30,0.5)";
  ctx.shadowBlur = size * 0.01;
  const leaves = 8;
  for (let i = 0; i < leaves; i++) {
    const t = i / (leaves - 1);
    const y = h * 0.5 - t * h * 0.95;
    const w = h * (0.62 - t * 0.42);
    const lh = h * (0.17 - t * 0.06);
    ctx.fillStyle = milk;
    ctx.beginPath();
    ctx.moveTo(-w, y);
    ctx.bezierCurveTo(-w * 0.8, y - lh * 1.4, w * 0.8, y - lh * 1.4, w, y);
    ctx.bezierCurveTo(w * 0.6, y - lh * 0.45, -w * 0.6, y - lh * 0.45, -w, y);
    ctx.fill();
    // crema line between leaves
    ctx.strokeStyle = "rgba(150,90,45,0.55)";
    ctx.lineWidth = size * 0.004;
    ctx.beginPath();
    ctx.moveTo(-w * 0.85, y - lh * 0.15);
    ctx.bezierCurveTo(-w * 0.5, y - lh * 0.75, w * 0.5, y - lh * 0.75, w * 0.85, y - lh * 0.15);
    ctx.stroke();
  }
  // heart cap
  ctx.fillStyle = milk;
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.5, h * 0.17, h * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();
  // stem pulled through
  ctx.strokeStyle = milk;
  ctx.lineWidth = size * 0.012;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, h * 0.62);
  ctx.lineTo(0, -h * 0.58);
  ctx.stroke();
  ctx.restore();
  return toTexture(c);
}

/**
  A vertical colour strip mapped along a lathe profile (the lathe's v coordinate runs from the bottom centre,
  up the outside, over the lip and down the inside). Stops are [v, colour].
*/
export function stripTexture(stops: [number, string][]) {
  const { c, ctx } = canvas(4, 512);
  // canvas y=0 is the top, which maps to v=1 (flipY), so draw upside down
  const g = ctx.createLinearGradient(0, 512, 0, 0);
  for (const [v, col] of stops) g.addColorStop(v, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 512);
  const t = toTexture(c);
  t.anisotropy = 1;
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter;
  return t;
}

/** Radial soft shadow / glow. */
export function radialTexture(inner: string, outer: string, size = 128) {
  const { c, ctx } = canvas(size, size);
  const h = size / 2;
  const g = ctx.createRadialGradient(h, h, 0, h, h, h);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return toTexture(c);
}
