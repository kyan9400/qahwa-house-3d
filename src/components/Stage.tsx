"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { stage } from "@/lib/stage-store";
import Poster from "./Poster";

// The whole 3D bundle (three + fiber + scene) is a separate chunk, loaded after the page is interactive.
const Experience = dynamic(() => import("@/three/Experience"), { ssr: false });

/**
  The sticky 3D layer behind the hero and the menu, plus the scroll controller that feeds it.
  The poster is server-rendered, so the page looks finished before any 3D code arrives.
*/
export default function Stage({ children }: { children: React.ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [mount, setMount] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const onReady = useCallback(() => setReady(true), []);
  const onFail = useCallback(() => setFailed(true), []);

  // Start loading the 3D only after the page has loaded and the main thread is idle.
  useEffect(() => {
    let idleId = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const start = () => {
      if ("requestIdleCallback" in window) idleId = window.requestIdleCallback(() => setMount(true), { timeout: 2500 });
      else timer = setTimeout(() => setMount(true), 300);
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => {
      window.removeEventListener("load", start);
      if (idleId) window.cancelIdleCallback(idleId);
      if (timer) clearTimeout(timer);
    };
  }, []);

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

  const showCanvas = mount && !failed;
  return (
    <div ref={wrapRef} className="relative">
      <div className="stage-layer pointer-events-none" aria-hidden="true">
        <div className="stage-poster" data-hidden={ready && !failed}>
          <Poster />
        </div>
        {showCanvas && (
          <div className="stage-canvas" data-ready={ready}>
            <Experience onReady={onReady} onFail={onFail} />
          </div>
        )}
        {showCanvas && !ready && (
          <div className="absolute right-4 top-20 flex items-center gap-2 text-sm text-sand sm:right-8">
            <span className="loader-dot inline-block h-2 w-2 rounded-full bg-saffron" />
            Warming the cups
          </div>
        )}
      </div>
      <div className="relative" style={{ marginTop: "-100svh" }}>
        {children}
      </div>
    </div>
  );
}
