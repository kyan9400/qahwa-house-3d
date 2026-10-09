/*
  Quality tiers — decided BEFORE the Canvas is created.
  1. A throwaway WebGL2 context tells us whether 3D works at all and which GPU this is.
  2. Software renderers -> low. Integrated laptop / phone GPUs and touch devices -> at most medium.
  3. ?quality=low|medium|high overrides everything.
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
  webgl: boolean;
  tier: Tier;
  gpu: string;
}

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

export function detectQuality(): QualityResult {
  let gl: WebGL2RenderingContext | null = null;
  try {
    gl = document.createElement("canvas").getContext("webgl2", { powerPreference: "high-performance" });
  } catch {
    gl = null;
  }
  if (!gl) return { webgl: false, tier: "low", gpu: "" };

  const gpu = gpuName(gl);
  gl.getExtension("WEBGL_lose_context")?.loseContext();

  const forced = forcedTier();
  if (forced) return { webgl: true, tier: forced, gpu };

  let tier = hardwareGuess();
  if (/swiftshader|llvmpipe|software|basic render/i.test(gpu)) tier = "low";
  else if (/intel|uhd|iris|mali|adreno|powervr|radeon\(tm\) graphics|apple gpu/i.test(gpu) && tier === "high")
    tier = "medium";
  return { webgl: true, tier, gpu };
}
