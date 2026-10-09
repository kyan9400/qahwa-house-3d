"use client";

import { useSyncExternalStore } from "react";
import { getMotion, setMotion, subscribeMotion } from "@/lib/motion";

export default function MotionToggle({ className = "" }: { className?: string }) {
  const mode = useSyncExternalStore(subscribeMotion, getMotion, () => "full" as const);
  const reduced = mode === "reduced";
  return (
    <button type="button" className={className} onClick={() => setMotion(reduced ? "full" : "reduced")}>
      {reduced ? "Turn on full motion" : "Reduce motion"}
    </button>
  );
}
