"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { TIERS, type QualityResult } from "@/lib/quality";
import { getMotion } from "@/lib/motion";
import World, { createResources, type Resources } from "./World";

interface Props {
  quality: QualityResult;
  onReady: () => void;
  onFail: () => void;
}

/**
  Lazy 3D entry (loaded with next/dynamic, ssr:false, only after the GPU probe in Stage said yes).
  The quality tier and motion mode are decided BEFORE the Canvas and its WebGL context exist.
  Geometry and painted textures are built first, in small steps that yield to the browser, so no single task
  blocks input for long; only then is the WebGL context created.
*/
export default function Experience({ quality, onReady, onFail }: Props) {
  const [reduced] = useState(() => getMotion() === "reduced");
  const settings = TIERS[quality.tier];
  const [built, setBuilt] = useState<{ settings: typeof settings; res: Resources } | null>(null);

  useEffect(() => {
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
  }, [settings, onFail]);

  if (!built || built.settings !== settings) return null;

  return (
    <Canvas
      frameloop="demand"
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
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          onFail();
        });
      }}
      style={{ position: "absolute", inset: 0, touchAction: "pan-y" }}
    >
      <World res={built.res} settings={settings} tier={quality.tier} reduced={reduced} onReady={onReady} />
    </Canvas>
  );
}
