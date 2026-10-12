"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { detectQuality, wants3d, type QualityResult } from "@/lib/quality";
import { afterLoadIdle } from "@/lib/schedule";
import { stage } from "@/lib/stage-store";
import Poster from "./Poster";

// The whole 3D bundle (three + fiber + scene) is a separate chunk. It is only requested once the component renders,
// which happens after window load + an idle callback, and never for software renderers.
const Experience = dynamic(() => import("@/three/Experience"), { ssr: false });

/**
  The sticky 3D layer behind the hero and the menu, plus the scroll controller that feeds it.
  The poster is server-rendered, so the page looks finished before any 3D code arrives; it stays up until the scene
  has compiled its shaders and drawn, then fades (opacity only). No WebGL / software GPU / lost context: poster only.
*/
export default function Stage({ children }: { children: React.ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [quality, setQuality] = useState<QualityResult | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [glyph, setGlyph] = useState(false);

  const onReady = useCallback(() => setReady(true), []);
  const onFail = useCallback(() => setFailed(true), []);

  // Only after the page has loaded and the main thread is idle: probe the GPU (tiny throwaway context, no three.js),
  // then mount (= download) the 3D chunk unless this is a software renderer.
  // The outline glyph fades in at the same moment: by then its (not preloaded) Arabic font has loaded, so the
  // font swap happens while it is still hidden and can never register as a layout shift.
  useEffect(
    () =>
      afterLoadIdle(() => {
        setGlyph(true);
        setQuality(detectQuality());
      }),
    [],
  );

  // Scroll -> stage store. One passive listener, at most one layout read per animation frame.
  useEffect(() => {
    const hero = document.getElementById("top");
    const items = Array.from(document.querySelectorAll<HTMLElement>("[data-menu-item]"));
    let raf = 0;
    let active = -1;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      const heroH = hero ? hero.offsetHeight : vh;
      stage.heroProgress = Math.min(1, Math.max(0, window.scrollY / (heroH * 0.85)));
      let a = 0;
      for (let i = 0; i < items.length; i++) if (items[i].getBoundingClientRect().top < vh * 0.55) a = i;
      if (a !== active) {
        active = a;
        stage.active = a;
        items.forEach((el, i) => {
          el.dataset.active = String(i === a);
        });
      }
      stage.invalidate();
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    const io = new IntersectionObserver(([entry]) => {
      stage.visible = entry.isIntersecting;
      if (entry.isIntersecting) stage.invalidate();
    });
    if (wrapRef.current) io.observe(wrapRef.current);

    const onVisibility = () => {
      if (!document.hidden) stage.invalidate();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const showCanvas = quality !== null && wants3d(quality) && !failed;
  return (
    <div ref={wrapRef} className="relative">
      <div className="stage-layer pointer-events-none" aria-hidden="true">
        {/* oversized outline lettering behind the cup: gives the right half depth before the 3D arrives */}
        <span lang="ar" className="stage-glyph" data-on={glyph}>
          قهوة
        </span>
        <div className="stage-poster" data-hidden={ready && !failed}>
          <Poster />
        </div>
        {showCanvas && (
          <div className="stage-canvas" data-ready={ready}>
            <Experience quality={quality} onReady={onReady} onFail={onFail} />
          </div>
        )}
        {showCanvas && !ready && (
          <div className="stage-loader absolute right-4 top-20 text-sm text-sand sm:right-8">
            Warming the cups
            {/* a thin saffron line fills while the shaders compile */}
            <span className="stage-loader-track">
              <span className="stage-loader-fill" />
            </span>
          </div>
        )}
      </div>
      <div className="relative" style={{ marginTop: "-100svh" }}>
        {children}
      </div>
    </div>
  );
}
