"use client";

import { useRef, useSyncExternalStore } from "react";
import { dismissMotionQuestion, setMotion, shouldAskAboutMotion, subscribeMotion } from "@/lib/motion";

/** Optional motion question (only shown when data-motion-ask is set on <html>; the site now starts in full motion, so it stays hidden). */
export default function MotionToast() {
  const ask = useSyncExternalStore(subscribeMotion, shouldAskAboutMotion, () => false);
  const boxRef = useRef<HTMLDivElement>(null);
  if (!ask) return null;
  return (
    <div
      ref={boxRef}
      role="region"
      aria-label="Motion settings"
      className="fixed bottom-4 left-4 right-4 z-50 max-w-sm rounded-2xl border border-walnut bg-roast p-5 text-sm text-crema shadow-2xl sm:right-auto"
    >
      <p>Your device asks for reduced motion, so the 3D tray stays calm. You can switch the full pour back on.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary" onClick={() => setMotion("full")}>
          Turn on full motion
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            const hadFocus = boxRef.current?.contains(document.activeElement);
            dismissMotionQuestion();
            if (hadFocus) document.getElementById("main")?.focus({ preventScroll: true });
          }}
        >
          Keep it calm
        </button>
      </div>
    </div>
  );
}
