"use client";

import { useEffect, useRef, useState } from "react";

const SECTIONS = [
  { id: "menu", label: "Menu" },
  { id: "origins", label: "Origins" },
  { id: "house", label: "The House" },
  { id: "beans", label: "Beans to go" },
  { id: "guestbook", label: "Guestbook" },
  { id: "visit", label: "Visit" },
];

/**
  A 2 px reading-progress bar under the header (transform: scaleX only) and six section dots on the right edge
  (wide screens). The dots are plain anchor links, so the native smooth scroll does the jump. They appear once
  the 3D stage has scrolled past, so they never sit over the tray.
*/
export default function Progress() {
  const barRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState("");
  const [show, setShow] = useState(false);

  // scroll -> bar, at most one layout read per animation frame (same pattern as the stage controller)
  useEffect(() => {
    const origins = document.getElementById("origins");
    let raf = 0;
    const update = () => {
      raf = 0;
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      const p = Math.min(1, Math.max(0, window.scrollY / max));
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
      setShow(origins ? origins.getBoundingClientRect().top < window.innerHeight * 0.5 : false);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // the active dot follows the section crossing the middle of the screen
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => el !== null);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div className="progress-track" aria-hidden="true">
        <div ref={barRef} className="progress-bar" />
      </div>
      <nav aria-label="Sections" className="section-dots" data-show={show}>
        <ul>
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} aria-label={s.label} aria-current={active === s.id ? "location" : undefined}>
                <span aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
