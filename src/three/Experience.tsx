"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { TIERS, type QualityResult } from "@/lib/quality";
import { getMotion } from "@/lib/motion";
import World, { createResources, prepareEnvironment, type EnvironmentPrep, type Resources } from "./World";

interface Props {
  quality: QualityResult;
  onReady: () => void;
  onFail: () => void;
}

/** Medium/high: starts compiling the environment's (large) filter shaders the moment the context exists. */
function EnvWarmup({ size, onPrep }: { size: number; onPrep: (p: EnvironmentPrep) => void }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const prep = prepareEnvironment(gl, size);
    onPrep(prep);
    return () => prep.dispose(); // no-op once World has baked it
  }, [gl, size, onPrep]);
  return null;
}

/**
  Lazy 3D entry (loaded with next/dynamic, ssr:false, only after the GPU probe in Stage said yes).
  The quality tier and motion mode are decided BEFORE the Canvas and its WebGL context exist.
  The context is created first so the GPU can start compiling the environment's filter shaders; while it does,
  geometry and painted textures are built in small steps that yield to the browser, so no single task blocks
  input for long. Then the scene mounts and compiles its own programs (see World's warm-up).
*/
export default function Experience({ quality, onReady, onFail }: Props) {
  const [reduced] = useState(() => getMotion() === "reduced");
  const settings = TIERS[quality.tier];
  const [built, setBuilt] = useState<{ settings: typeof settings; res: Resources } | null>(null);
  const [envPrep, setEnvPrep] = useState<EnvironmentPrep | null>(null);
  const [glReady, setGlReady] = useState(false);
  // The resources are built only once the context exists (and, on medium/high, the environment's filter shaders
  // are compiling): their yielding steps would otherwise starve the Canvas's own setup and delay the context.
  const canBuild = settings.envSize > 0 ? envPrep !== null : glReady;

  useEffect(() => {
    if (!canBuild) return;
    let cancelled = false;
    createResources(settings).then(
      (res) => {
        if (cancelled) res.dispose();
        else setBuilt({ settings, res });
      },
      () => !cancelled && onFail(),
    );
    return () => {
      cancelled = true;
    };
  }, [settings, onFail, canBuild]);

  const sceneReady = built !== null && built.settings === settings && (settings.envSize === 0 || envPrep !== null);

  return (
    <Canvas
      frameloop="demand"
      shadows={settings.shadows ? "percentage" : false}
      dpr={[1, settings.dprCap]}
      gl={{
        antialias: settings.antialias,
        alpha: true,
        stencil: false,
        powerPreference: "high-performance",
      }}
      camera={{ fov: 30, near: 0.1, far: 60, position: [0, 0.62, 3.2] }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        // production: skip the per-program info-log reads (each one waits on the GPU process at first use)
        gl.debug.checkShaderErrors = process.env.NODE_ENV !== "production";
        setGlReady(true);
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          onFail();
        });
      }}
      style={{ position: "absolute", inset: 0, touchAction: "pan-y" }}
    >
      {settings.envSize > 0 && <EnvWarmup size={settings.envSize} onPrep={setEnvPrep} />}
      {sceneReady && (
        <World
          res={built.res}
          settings={settings}
          tier={quality.tier}
          reduced={reduced}
          envPrep={envPrep}
          onReady={onReady}
        />
      )}
    </Canvas>
  );
}
