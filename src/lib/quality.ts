/*
  Quality tiers — decided BEFORE the Canvas is created.
  1. A throwaway WebGL2 context (no three.js, created after the page has loaded) tells us whether 3D works at all
     and which GPU this is.
  2. Software renderers (SwiftShader, llvmpipe, ...) -> no 3D at all: the poster stays.
     Integrated laptop / phone GPUs and touch devices -> at most medium.
  3. ?quality=low|medium|high overrides everything and forces the 3D on, even on a software renderer.
*/

export type Tier = "low" | "medium" | "high";

export interface TierSettings {
  dprCap: number;
  antialias: boolean;
  steam: number;
  beans: number;
  envSize: number; // 0 = no environment map
  segments: number; // lathe radial segments
}

export const TIERS: Record<Tier, TierSettings> = {
  high: { dprCap: 2, antialias: true, steam: 260, beans: 42, envSize: 256, segments: 96 },
  medium: { dprCap: 1.5, antialias: true, steam: 150, beans: 28, envSize: 128, segments: 64 },
  low: { dprCap: 1, antialias: false, steam: 60, beans: 14, envSize: 0, segments: 40 },
};

export interface QualityResult {
  /** a WebGL2 context could be created (with ?quality= forced, even a slow one) */
  webgl: boolean;
  /** software rasteriser, or the browser flagged a major performance caveat */
  software: boolean;
  /** ?quality=low|medium|high was given: show the 3D whatever the GPU */
  forced: boolean;
  tier: Tier;
  gpu: string;
}

const SOFTWARE_GPU = /swiftshader|llvmpipe|softpipe|software|basic render|mesa offscreen/i;

function forcedTier(): Tier | null {
  const q = new URLSearchParams(window.location.search).get("quality");
  return q === "low" || q === "medium" || q === "high" ? q : null;
}

function hardwareGuess(): Tier {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const cores = nav.hardwareConcurrency || 4;
  const memory = nav.deviceMemory || 4;
  if (nav.connection?.saveData || cores <= 2 || memory <= 2) return "low";
  const touch = window.matchMedia("(pointer: coarse)").matches;
  if (touch || cores <= 4 || memory <= 4) return "medium";
  return "high";
}

function gpuName(gl: WebGL2RenderingContext): string {
  const name = String(gl.getParameter(gl.RENDERER) || "");
  if (!/^webkit/i.test(name)) return name;
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  return info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL) || name) : name;
}

function context(options: WebGLContextAttributes): WebGL2RenderingContext | null {
  try {
    return document.createElement("canvas").getContext("webgl2", options);
  } catch {
    return null;
  }
}

let cached: QualityResult | null = null;

/** Client only, cached. Cheap (one tiny throwaway context, no three.js); call it after 'load', never during hydration. */
export function detectQuality(): QualityResult {
  if (cached) return cached;
  const forced = forcedTier();

  // the browser refuses this when it would fall back to a slow (software) path
  let gl = context({ failIfMajorPerformanceCaveat: true });
  let caveat = false;
  if (!gl) {
    caveat = true;
    // a second context is only worth it when the URL insists on 3D anyway
    if (forced) gl = context({});
  }
  if (!gl) {
    cached = { webgl: false, software: caveat, forced: forced !== null, tier: "low", gpu: "" };
    return cached;
  }

  const gpu = gpuName(gl);
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  const software = caveat || SOFTWARE_GPU.test(gpu);

  if (forced) {
    cached = { webgl: true, software, forced: true, tier: forced, gpu };
    return cached;
  }

  let tier = hardwareGuess();
  if (software) tier = "low";
  else if (/intel|uhd|iris|mali|adreno|powervr|radeon\(tm\) graphics|apple gpu/i.test(gpu) && tier === "high")
    tier = "medium";
  cached = { webgl: true, software, forced: false, tier, gpu };
  return cached;
}

/** Software renderers keep the poster (the 3D chunk is never loaded) unless ?quality= forces the 3D on. */
export function wants3d(q: QualityResult): boolean {
  return q.webgl && (!q.software || q.forced);
}
