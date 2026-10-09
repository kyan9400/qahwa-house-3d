"use client";

import { useRef, useSyncExternalStore } from "react";
import { dismissMotionQuestion, setMotion, shouldAskAboutMotion, subscribeMotion } from "@/lib/motion";

/** First visit with the OS "reduce motion" setting on: explain why things are calm and offer full motion. */
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
