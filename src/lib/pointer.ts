/*
  Magnetic buttons + a crema ring that follows the pointer.
  The native cursor stays visible: the ring is a follower, never a replacement.
  Uses the CSS `translate` property (not `transform`), so it composes with the buttons' own hover lift.
*/

const MAGNET = 6; // px, the most a button moves toward the pointer

export function startPointer(): () => void {
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!fine || document.documentElement.dataset.motion === "reduced") return () => {};

  const ring = document.createElement("div");
  ring.className = "cursor-ring";
  ring.setAttribute("aria-hidden", "true");
  document.body.appendChild(ring);

  let x = -100;
  let y = -100;
  let rx = x;
  let ry = y;
  let raf = 0;
  let magnet: HTMLElement | null = null;

  const tick = () => {
    rx += (x - rx) * 0.22;
    ry += (y - ry) * 0.22;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    // stop the loop once the ring has caught up (idle = no work)
    raf = Math.abs(x - rx) + Math.abs(y - ry) > 0.2 ? requestAnimationFrame(tick) : 0;
  };

  const release = () => {
    if (magnet) magnet.style.translate = "";
    magnet = null;
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    x = e.clientX;
    y = e.clientY;
    ring.dataset.on = "true";
    if (!raf) raf = requestAnimationFrame(tick);

    const target = e.target instanceof Element ? e.target : null;
    ring.dataset.hover = String(Boolean(target?.closest("a, button")));
    const btn = target?.closest<HTMLElement>(".btn-primary, .btn-ghost") ?? null;
    if (btn !== magnet) release();
    if (btn) {
      magnet = btn;
      const r = btn.getBoundingClientRect();
      const dx = ((x - (r.left + r.width / 2)) / (r.width / 2)) * MAGNET;
      const dy = ((y - (r.top + r.height / 2)) / (r.height / 2)) * MAGNET;
      btn.style.translate = `${Math.max(-MAGNET, Math.min(MAGNET, dx))}px ${Math.max(-MAGNET, Math.min(MAGNET, dy))}px`;
    }
  };

  const onLeave = () => {
    ring.dataset.on = "false";
    release();
  };

  window.addEventListener("pointermove", onMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", onLeave);

  return () => {
    window.removeEventListener("pointermove", onMove);
    document.documentElement.removeEventListener("pointerleave", onLeave);
    if (raf) cancelAnimationFrame(raf);
    release();
    ring.remove();
  };
}
