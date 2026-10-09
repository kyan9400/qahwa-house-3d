"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { detectQuality, TIERS } from "@/lib/quality";
import { getMotion } from "@/lib/motion";
import World from "./World";

interface Props {
  onReady: () => void;
  onFail: () => void;
}

/**
  Lazy 3D entry (loaded with next/dynamic, ssr:false).
  The quality tier and motion mode are decided here, BEFORE the Canvas and its WebGL context exist.
*/
export default function Experience({ onReady, onFail }: Props) {
  const [quality] = useState(detectQuality);
  const [reduced] = useState(() => getMotion() === "reduced");

  useEffect(() => {
    if (!quality.webgl) onFail();
  }, [quality.webgl, onFail]);

  if (!quality.webgl) return null;
  const settings = TIERS[quality.tier];

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
      <World settings={settings} tier={quality.tier} reduced={reduced} onReady={onReady} />
    </Canvas>
  );
}
