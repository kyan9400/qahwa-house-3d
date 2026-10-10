"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type NavLink = { href: string; label: string };

/**
 * Small-screen navigation: a "Menu" button that opens a solid panel under the header with the section links
 * and the Visit call to action. Escape or a link click closes it; focus moves into the panel and back to the
 * button; page scroll is locked while it is open. Plain DOM + CSS (opacity/transform), no 3D dependency.
 */
export default function MobileNav({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  const returnFocus = useRef(true);

  const unlock = () => {
    document.documentElement.style.overflow = "";
  };

  const close = useCallback((restoreFocus = true) => {
    // release the scroll lock right away so an in-page link can scroll to its section
    unlock();
    returnFocus.current = restoreFocus;
    setOpen(false);
  }, []);
  // a link hands the keyboard to its section; pulling focus back to the button would undo that
  const onLinkClick = () => close(false);

  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      document.documentElement.style.overflow = "hidden";
      panelRef.current?.querySelector<HTMLElement>("a")?.focus();
    } else if (wasOpen.current) {
      wasOpen.current = false;
      unlock();
      if (returnFocus.current) buttonRef.current?.focus({ preventScroll: true });
      returnFocus.current = true;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab") return;
      // keep Tab inside the button + panel while open
      const items = [buttonRef.current, ...Array.from(panelRef.current?.querySelectorAll<HTMLElement>("a") ?? [])].filter(
        (el): el is HTMLElement => el !== null,
      );
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    // the panel is only for small screens: close it if the window grows past the breakpoint
    const wide = window.matchMedia("(min-width: 768px)");
    const onWide = () => {
      if (wide.matches) close(false);
    };
    document.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      document.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
      unlock();
    };
  }, [open, close]);

  return (
    <div className="md:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => (open ? close() : setOpen(true))}
        className="inline-flex min-h-11 min-w-11 items-center gap-2 rounded-full border border-sand/45 px-4 text-sm font-semibold text-crema transition-colors hover:border-crema"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="shrink-0">
          {open ? (
            <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          ) : (
            <path d="M2 4.5h12M2 8h12M2 11.5h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          )}
        </svg>
        {open ? "Close" : "Menu"}
      </button>
      <div
        ref={panelRef}
        id="mobile-nav"
        data-open={open}
        className="mobile-nav fixed inset-x-0 top-16 bottom-0 overflow-y-auto border-t border-walnut/60 bg-espresso"
      >
        <ul className="mx-auto flex w-full max-w-[1200px] flex-col gap-1 px-4 pt-6 pb-10 sm:px-8">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                onClick={onLinkClick}
                className="font-display flex min-h-14 items-center border-b border-walnut/60 text-2xl text-crema transition-colors hover:text-saffron"
              >
                {l.label}
              </a>
            </li>
          ))}
          <li className="mt-8">
            <a href="#visit" onClick={onLinkClick} className="btn btn-primary w-full">
              Plan a visit
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
