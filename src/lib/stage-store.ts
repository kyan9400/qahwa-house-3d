/*
  Tiny mutable store shared by the DOM scroll controller and the 3D scene.
  Written on scroll (passive listener), read inside useFrame — no React state per frame.
*/

export const MENU_COUNT = 4;

export const stage = {
  /** 0 at the top of the hero -> 1 when the menu begins */
  heroProgress: 0,
  /** which drink is at the front of the tray (0..3) */
  active: 0,
  /** the stage is on screen */
  visible: true,
  /** wakes the on-demand renderer; replaced by the scene once it mounts */
  invalidate: () => {},
};
