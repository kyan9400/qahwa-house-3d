/*
  Motion preference.
  The site starts in full motion on every first visit (the OS "reduce motion" setting is often switched on for
  speed, not comfort). Visitors can reduce motion with the toggle; the choice is remembered in localStorage and
  ?motion=full / ?motion=reduced in the URL overrides it. An inline script in <head> applies the result to
  <html data-motion="full|reduced"> before first paint (see MOTION_BOOT_SCRIPT).
  It also adds the "js" class, so the heading reveals only hide words when script is actually running.
*/

export const MOTION_KEY = "qahwa-motion";

export const MOTION_BOOT_SCRIPT = `(function(){try{var d=document.documentElement,c=null;d.classList.add('js');
var u=new URLSearchParams(location.search).get('motion');
if(u==='full'||u==='reduced'){c=u}else{try{c=localStorage.getItem('${MOTION_KEY}')}catch(e){}}
d.dataset.motion=c==='reduced'?'reduced':'full'}catch(e){}})();`;

export type MotionMode = "full" | "reduced";

const listeners = new Set<() => void>();

export function getMotion(): MotionMode {
  return document.documentElement.dataset.motion === "reduced" ? "reduced" : "full";
}

export function shouldAskAboutMotion(): boolean {
  return document.documentElement.dataset.motionAsk === "1";
}

export function subscribeMotion(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function save(value: MotionMode): boolean {
  try {
    localStorage.setItem(MOTION_KEY, value);
    return true;
  } catch {
    return false;
  }
}

/** Save the choice and reload so every system (3D, CSS) starts cleanly in the chosen mode. */
export function setMotion(value: MotionMode) {
  const url = new URL(window.location.href);
  if (save(value)) url.searchParams.delete("motion");
  else url.searchParams.set("motion", value);
  try {
    history.replaceState(null, "", url);
    window.location.reload();
  } catch {
    window.location.href = url.href;
  }
}

/** Keep the current (reduced) mode without reloading and stop asking. */
export function dismissMotionQuestion() {
  if (!save("reduced")) {
    const url = new URL(window.location.href);
    url.searchParams.set("motion", "reduced");
    try {
      history.replaceState(null, "", url);
    } catch {
      /* the question simply returns next visit */
    }
  }
  delete document.documentElement.dataset.motionAsk;
  listeners.forEach((fn) => fn());
}
