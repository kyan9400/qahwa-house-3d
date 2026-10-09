"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Tier, TierSettings } from "@/lib/quality";
import { MENU_COUNT, stage } from "@/lib/stage-store";
import {
  FINJAN,
  LATTE,
  TALL,
  TUMBLER,
  beanGeometry,
  innerRadiusAt,
  lathe,
  liquidBody,
  saucerProfile,
  type VesselShape,
} from "./geometry";
import { cremaTexture, radialTexture, stripTexture, woodTexture } from "./textures";
import {
  steamFragment,
  steamVertex,
  streamFragment,
  streamVertex,
  surfaceFragment,
  surfaceVertex,
} from "./shaders";

/* ------------------------------------------------------------------ layout */

const RING = 1.2; // distance of each vessel from the tray centre
const STREAM_TOP = 4.2; // the pour starts above the frame
const FALL = 0.45;
const FILL = 2.5;
const LIFT = 0.42;
const ART = 0.9;

interface VesselDef {
  shape: VesselShape;
  hot: boolean;
  glass: boolean;
  saucer: number; // saucer radius, 0 = none
  liquid: string;
  stream: string;
  streamRadius: number;
  bodyOpacity: number;
}

const VESSELS: VesselDef[] = [
  { shape: LATTE, hot: true, glass: false, saucer: 0.7, liquid: "#8a5530", stream: "#3a1c0b", streamRadius: 0.03, bodyOpacity: 1 },
  { shape: FINJAN, hot: true, glass: false, saucer: 0.55, liquid: "#a8742c", stream: "#8c5a1c", streamRadius: 0.02, bodyOpacity: 1 },
  { shape: TUMBLER, hot: true, glass: true, saucer: 0, liquid: "#7a3313", stream: "#5e260c", streamRadius: 0.026, bodyOpacity: 0.86 },
  { shape: TALL, hot: false, glass: true, saucer: 0, liquid: "#24110a", stream: "#2a140a", streamRadius: 0.028, bodyOpacity: 0.95 },
];

function saucerTop(radius: number) {
  return radius > 0 ? 0.034 * (radius / 0.7) : 0;
}

const BASE_Y = VESSELS.map((v) => saucerTop(v.saucer));

function surfaceY(i: number, fill: number) {
  const s = VESSELS[i].shape;
  return BASE_Y[i] + s.fillBottom + (s.fillTop - s.fillBottom) * fill;
}

/** Deterministic random numbers (render must stay pure). */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const smoothstep = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};
const easeOut = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const easeIn = (t: number) => Math.pow(Math.min(1, Math.max(0, t)), 2);

/* --------------------------------------------------------------- resources */

function createResources(settings: TierSettings) {
  const seg = settings.segments;
  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(x: T) => {
    disposables.push(x);
    return x;
  };

  const bodies = VESSELS.map((v) => keep(lathe(v.shape.profile, seg)));
  const saucers = VESSELS.map((v) => (v.saucer ? keep(lathe(saucerProfile(v.saucer), seg)) : null));
  const liquids = VESSELS.map((v) => (v.glass ? keep(liquidBody(v.shape, Math.round(seg * 0.75))) : null));
  const disc = keep(new THREE.CircleGeometry(1, Math.round(seg * 0.75)).rotateX(-Math.PI / 2));
  const handle = keep(new THREE.TorusGeometry(0.13, 0.032, 12, 40, Math.PI * 1.3).rotateZ(-Math.PI * 0.65 - 0.44));
  const stream = keep(new THREE.CylinderGeometry(1, 0.85, 1, 14, 24, true).translate(0, -0.5, 0));
  const bean = keep(beanGeometry());
  const ice = keep(new THREE.BoxGeometry(0.15, 0.13, 0.15, 1, 1, 1));
  const date = keep(new THREE.SphereGeometry(1, 16, 12));
  const trayTop = keep(new THREE.CylinderGeometry(2.0, 1.96, 0.08, Math.max(48, seg), 1));
  const rim = keep(new THREE.TorusGeometry(2.0, 0.045, 10, Math.max(64, seg * 1.5)));
  const plane = keep(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2));

  // steam: positions are computed in the shader; the attribute only seeds them
  const steamGeo = keep(new THREE.BufferGeometry());
  const r = rng(42);
  const seeds = new Float32Array(settings.steam * 4);
  for (let k = 0; k < seeds.length; k++) seeds[k] = r();
  steamGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(settings.steam * 3), 3));
  steamGeo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
  steamGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 50);

  // textures (painted on canvas)
  const wood = keep(woodTexture(settings.envSize ? 1024 : 512));
  wood.wrapS = wood.wrapT = THREE.RepeatWrapping;
  const crema = keep(cremaTexture(settings.envSize >= 256 ? 512 : 256));
  const shadowTex = keep(radialTexture("rgba(12,6,2,0.75)", "rgba(12,6,2,0)"));
  const glowTex = keep(radialTexture("rgba(227,165,60,0.22)", "rgba(227,165,60,0)", 256));

  const L = LATTE.lipV;
  const latteStrip = keep(
    stripTexture([
      [0, "#b48a64"],
      [0.07, "#b48a64"],
      [0.085, "#8f3a1b"],
      [L - 0.03, "#a3461f"],
      [L - 0.005, "#efe3cf"],
      [1, "#f1e6d4"],
    ]),
  );
  const F = FINJAN.lipV;
  const finjanStrip = keep(
    stripTexture([
      [0, "#f3ede3"],
      [F - 0.13, "#f3ede3"],
      [F - 0.12, "#3f6a52"],
      [F - 0.1, "#3f6a52"],
      [F - 0.09, "#f3ede3"],
      [F - 0.05, "#f3ede3"],
      [F - 0.04, "#d49a36"],
      [F + 0.02, "#d49a36"],
      [F + 0.03, "#f5efe6"],
      [1, "#f5efe6"],
    ]),
  );

  const glaze = (map: THREE.Texture, rough: number) =>
    keep(
      settings.envSize >= 256
        ? new THREE.MeshPhysicalMaterial({ map, roughness: rough, clearcoat: 0.6, clearcoatRoughness: 0.15, side: THREE.DoubleSide })
        : new THREE.MeshStandardMaterial({ map, roughness: rough, side: THREE.DoubleSide }),
    );

  const glass = keep(
    new THREE.MeshPhysicalMaterial({
      color: "#fff8ee",
      roughness: 0.06,
      metalness: 0,
      transparent: true,
      opacity: settings.envSize ? 0.2 : 0.3,
      side: THREE.DoubleSide,
      depthWrite: false,
      envMapIntensity: 1.6,
      specularIntensity: 1,
    }),
  );

  const bodyMats = [glaze(latteStrip, 0.38), glaze(finjanStrip, 0.22), glass, glass];
  const saucerMats = [
    keep(new THREE.MeshStandardMaterial({ color: "#ede1cc", roughness: 0.35 })),
    keep(new THREE.MeshStandardMaterial({ color: "#f3ede3", roughness: 0.25 })),
    null,
    null,
  ];
  const handleMat = keep(new THREE.MeshStandardMaterial({ color: "#9b4320", roughness: 0.38 }));

  const liquidMats = VESSELS.map((v) =>
    v.glass
      ? keep(
          new THREE.MeshStandardMaterial({
            color: v.liquid,
            roughness: 0.15,
            transparent: true,
            opacity: v.bodyOpacity,
            depthWrite: false,
          }),
        )
      : null,
  );

  const surfaceMats = VESSELS.map((v, i) =>
    keep(
      new THREE.ShaderMaterial({
        vertexShader: surfaceVertex,
        fragmentShader: surfaceFragment,
        transparent: v.glass,
        depthWrite: !v.glass,
        uniforms: {
          uColor: { value: new THREE.Color(i === 0 ? "#a96a3b" : v.liquid) },
          uMap: { value: crema },
          uUseMap: { value: i === 0 ? 1 : 0 },
          uArt: { value: 0 },
          uRipple: { value: 0 },
          uTime: { value: 0 },
          uOpacity: { value: v.glass ? Math.min(1, v.bodyOpacity + 0.08) : 1 },
        },
      }),
    ),
  );

  const streamMat = keep(
    new THREE.ShaderMaterial({
      vertexShader: streamVertex,
      fragmentShader: streamFragment,
      uniforms: { uColor: { value: new THREE.Color(VESSELS[0].stream) }, uTime: { value: 0 } },
    }),
  );

  const steamMat = keep(
    new THREE.ShaderMaterial({
      vertexShader: steamVertex,
      fragmentShader: steamFragment,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uOrigin: { value: new THREE.Vector3(0, 0.6, RING) },
        uRadius: { value: 0.22 },
        uHeight: { value: 1.25 },
        uViewportH: { value: 800 },
        uOpacity: { value: 0 },
      },
    }),
  );

  const beanMat = keep(new THREE.MeshStandardMaterial({ color: "#4a2816", roughness: 0.42, metalness: 0.05 }));
  const iceMat = keep(
    new THREE.MeshPhysicalMaterial({
      color: "#f4efe8",
      roughness: 0.18,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      envMapIntensity: 1.5,
    }),
  );
  const dateMat = keep(new THREE.MeshStandardMaterial({ color: "#4f2312", roughness: 0.3 }));
  const traySide = keep(new THREE.MeshStandardMaterial({ color: "#3b2315", roughness: 0.55 }));
  const trayTopMat = keep(new THREE.MeshStandardMaterial({ map: wood, roughness: 0.5 }));
  const rimMat = keep(new THREE.MeshStandardMaterial({ color: "#4a2c1a", roughness: 0.4 }));
  const shadowMat = keep(new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  const glowMat = keep(new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false }));

  return {
    bodies,
    saucers,
    liquids,
    disc,
    handle,
    stream,
    bean,
    ice,
    date,
    trayTop,
    rim,
    plane,
    steamGeo,
    bodyMats,
    saucerMats,
    handleMat,
    liquidMats,
    surfaceMats,
    streamMat,
    steamMat,
    beanMat,
    iceMat,
    dateMat,
    traySide,
    trayTopMat,
    rimMat,
    shadowMat,
    glowMat,
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}

/** A warm "studio" made of glowing panels, baked once into a PMREM environment (no HDRI download). */
function bakeEnvironment(gl: THREE.WebGLRenderer, size: number) {
  const env = new THREE.Scene();
  env.background = new THREE.Color("#120a06");
  const box = new THREE.PlaneGeometry(1, 1);
  const panel = (color: string, intensity: number, pos: [number, number, number], scale: [number, number]) => {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(box, m);
    mesh.position.set(...pos);
    mesh.scale.set(scale[0], scale[1], 1);
    mesh.lookAt(0, 0, 0);
    env.add(mesh);
    return m;
  };
  const mats = [
    panel("#ffe2b8", 3.2, [0, 6, 2], [8, 3]), // soft key overhead
    panel("#ffcf8a", 2.0, [-6, 2, 3], [2, 6]), // window strip left
    panel("#e3a53c", 1.6, [5, 1.5, -4], [3, 4]), // saffron rim
    panel("#f2e5cf", 0.8, [0, 1, 7], [6, 1.5]), // fill from camera side
  ];
  const pm = new THREE.PMREMGenerator(gl);
  const rt = pm.fromScene(env, 0.035, 0.1, 50, { size });
  pm.dispose();
  box.dispose();
  mats.forEach((m) => m.dispose());
  return rt;
}

/* ------------------------------------------------------------------- world */

interface WorldProps {
  settings: TierSettings;
  tier: Tier;
  reduced: boolean;
  onReady: () => void;
}

export default function World({ settings, tier, reduced, onReady }: WorldProps) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const getState = useThree((s) => s.get);

  const res = useMemo(() => createResources(settings), [settings]);
  // the frame loop writes uniforms through this ref (render-time values stay untouched)
  const live = useRef<ReturnType<typeof createResources> | null>(null);
  useEffect(() => {
    live.current = res;
    return () => {
      live.current = null;
      res.dispose();
    };
  }, [res]);

  const trayRef = useRef<THREE.Group>(null);
  const streamRef = useRef<THREE.Mesh>(null);
  const steamRef = useRef<THREE.Points>(null);
  const beansRef = useRef<THREE.InstancedMesh>(null);
  const surfaceRefs = useRef<(THREE.Mesh | null)[]>([]);
  const liquidRefs = useRef<(THREE.Mesh | null)[]>([]);

  // All animation state lives in one mutable object: read and written only inside useFrame / effects.
  const anim = useRef({
    time: 0,
    readyAt: -1,
    fills: reduced ? [1, 1, 1, 1] : [0, 0, 0, 0],
    art: reduced ? 1 : 0,
    artT: -1,
    pourIdx: -1,
    pourT: 0,
    ripple: [0, 0, 0, 0],
    angle: 0,
    hero: 0,
    steam: 0,
    vw: 0,
    vh: 0,
    // adaptive resolution
    dpr: Math.min(typeof window === "undefined" ? 1 : window.devicePixelRatio || 1, settings.dprCap),
    avg: 16.7,
    screenMs: 16.7,
    settleUntil: 0,
    calmSince: 0,
    lastRaise: -1e9,
    bounces: 0,
  });

  // Reused objects: no allocations inside useFrame.
  const tmp = useMemo(
    () => ({
      camPos: new THREE.Vector3(),
      camTarget: new THREE.Vector3(),
      heroPos: new THREE.Vector3(0, 1.05, 3.0),
      heroTarget: new THREE.Vector3(0, 0.3, RING),
      menuPos: new THREE.Vector3(0, 2.75, 5.5),
      menuTarget: new THREE.Vector3(0, 0.25, 0.3),
      orbitCenter: new THREE.Vector3(),
      obj: new THREE.Object3D(),
    }),
    [],
  );

  // Per-bean orbit parameters (deterministic).
  const beanParams = useMemo(() => {
    const r = rng(9);
    return Array.from({ length: settings.beans }, (_, i) => ({
      ring: 0.82 + r() * 0.35,
      phase: (i / settings.beans) * Math.PI * 2 + r() * 0.4,
      speed: (0.22 + r() * 0.18) * (r() < 0.25 ? -1 : 1),
      y: 0.22 + r() * 0.5,
      tilt: (r() - 0.5) * 0.5,
      spin: 0.6 + r() * 1.6,
      scale: 0.85 + r() * 0.4,
      rx: r() * 6.28,
      rz: r() * 6.28,
    }));
  }, [settings.beans]);

  // Environment map: baked once from code-made light panels (medium/high only).
  useEffect(() => {
    if (!settings.envSize) return;
    const rt = bakeEnvironment(gl, settings.envSize);
    const s = getState().scene;
    s.environment = rt.texture;
    s.environmentIntensity = 0.85;
    invalidate();
    return () => {
      s.environment = null;
      rt.dispose();
    };
  }, [gl, getState, settings.envSize, invalidate]);

  // Reduced motion: beans rest on the tray (they turn with it) instead of orbiting.
  useEffect(() => {
    const mesh = beansRef.current;
    if (!mesh || !reduced) return;
    const r = rng(5);
    const o = tmp.obj;
    let placed = 0;
    let guard = 0;
    while (placed < settings.beans && guard++ < 2000) {
      const a = r() * Math.PI * 2;
      const d = 0.35 + Math.sqrt(r()) * 1.45;
      const x = Math.sin(a) * d;
      const z = Math.cos(a) * d;
      let ok = true;
      for (let i = 0; i < MENU_COUNT; i++) {
        const va = (i * Math.PI) / 2;
        const dx = x - Math.sin(va) * RING;
        const dz = z - Math.cos(va) * RING;
        if (dx * dx + dz * dz < Math.pow((VESSELS[i].saucer || 0.4) + 0.12, 2)) ok = false;
      }
      if (!ok) continue;
      o.position.set(x, 0.04, z);
      o.rotation.set(r() < 0.5 ? 0 : Math.PI, r() * 6.28, 0);
      o.scale.setScalar(0.9 + r() * 0.3);
      o.updateMatrix();
      mesh.setMatrixAt(placed++, o.matrix);
    }
    mesh.count = placed;
    mesh.instanceMatrix.needsUpdate = true;
    invalidate();
  }, [reduced, settings.beans, tmp, invalidate]);

  // Hook the DOM scroll controller up, then warm up shaders behind the loader before revealing.
  useEffect(() => {
    stage.invalidate = invalidate;
    let cancelled = false;
    const reveal = () => {
      if (cancelled) return;
      invalidate();
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (cancelled) return;
          anim.current.readyAt = anim.current.time;
          invalidate();
          onReady();
        }),
      );
    };
    gl.compileAsync(scene, camera).then(reveal, reveal);
    return () => {
      cancelled = true;
      stage.invalidate = () => {};
    };
  }, [gl, scene, camera, invalidate, onReady]);

  useFrame((state, delta) => {
    const R = live.current;
    if (!R) return;
    const a = anim.current;
    const dt = Math.min(delta, 1 / 30);
    a.time += dt;
    const t = a.time;
    const cam = state.camera as THREE.PerspectiveCamera;
    const { width: w, height: h } = state.size;

    /* ---------- adaptive resolution (frame time vs. the screen's own refresh) */
    const ms = delta * 1000;
    const now = performance.now();
    if (ms > 4 && ms < 100) {
      a.screenMs = Math.min(a.screenMs * 1.002, ms);
      a.avg += (ms - a.avg) * 0.1;
      if (now > a.settleUntil && !reduced) {
        const cap = Math.min(window.devicePixelRatio || 1, settings.dprCap);
        const floor = Math.min(1, cap) * 0.75;
        const slowMs = Math.max(21, a.screenMs * 1.3);
        const fastMs = Math.max(17.5, a.screenMs * 1.1);
        let next = a.dpr;
        if (a.avg > slowMs && a.dpr > floor) {
          if (now - a.lastRaise < 3000) a.bounces++;
          next = Math.max(floor, Math.min(a.dpr - 0.25, a.dpr * Math.sqrt(fastMs / a.avg)));
        } else if (a.avg < fastMs && a.dpr < cap && a.bounces < 2) {
          if (!a.calmSince) a.calmSince = now;
          if (now - a.calmSince > 2000) {
            next = Math.min(cap, a.dpr + 0.25);
            a.lastRaise = now;
          }
        } else a.calmSince = 0;
        if (next !== a.dpr) {
          a.dpr = next;
          state.setDpr(next);
          a.settleUntil = now + 600;
          a.calmSince = 0;
          a.avg = a.screenMs;
        }
      }
    }

    /* ---------- camera: hero close-up -> tray view, framed around the copy */
    if (w !== a.vw || h !== a.vh) {
      a.vw = w;
      a.vh = h;
      const aspect = w / h;
      if (w >= 900 && aspect > 1.05) cam.setViewOffset(w, h, -w * 0.19, 0, w, h);
      else if (aspect < 1) cam.setViewOffset(w, h, 0, h * 0.17, w, h);
      else cam.setViewOffset(w, h, -w * 0.08, h * 0.06, w, h);
      cam.updateProjectionMatrix();
    }
    const heroTarget = reduced ? (stage.heroProgress > 0.5 ? 1 : 0) : smoothstep(stage.heroProgress);
    a.hero = reduced ? heroTarget : a.hero + (heroTarget - a.hero) * (1 - Math.exp(-dt * 6));
    if (Math.abs(heroTarget - a.hero) < 1e-4) a.hero = heroTarget;
    const k = a.hero;
    const aspect = w / h;
    const far = aspect < 1 ? Math.pow(Math.min(2.1, 1 / aspect), 0.8) : 1;
    tmp.camTarget.lerpVectors(tmp.heroTarget, tmp.menuTarget, k);
    tmp.camPos.lerpVectors(tmp.heroPos, tmp.menuPos, k).sub(tmp.camTarget).multiplyScalar(far).add(tmp.camTarget);
    cam.position.copy(tmp.camPos);
    cam.lookAt(tmp.camTarget);

    /* ---------- tray: turn the active drink to the front */
    const target = (-stage.active * Math.PI) / 2;
    a.angle = reduced ? target : a.angle + (target - a.angle) * (1 - Math.exp(-dt * 4.2));
    if (Math.abs(target - a.angle) < 1e-4) a.angle = target;
    if (trayRef.current) trayRef.current.rotation.y = a.angle;
    const settled = Math.abs(target - a.angle) < 0.03;

    /* ---------- the pour */
    const stream = streamRef.current;
    let pouring = false;
    if (!reduced && a.readyAt >= 0) {
      if (a.pourIdx >= 0 && a.pourIdx !== stage.active) {
        // scrolled away mid-pour: finish that cup instantly
        a.fills[a.pourIdx] = 1;
        if (a.pourIdx === 0 && a.artT < 0) a.artT = t;
        a.pourIdx = -1;
      }
      if (a.pourIdx < 0 && settled && a.fills[stage.active] < 1 && t - a.readyAt > 0.5) {
        a.pourIdx = stage.active;
        a.pourT = 0;
        R.streamMat.uniforms.uColor.value.set(VESSELS[a.pourIdx].stream);
      }
      if (a.pourIdx >= 0) {
        pouring = true;
        const i = a.pourIdx;
        a.pourT += dt;
        const p = a.pourT;
        let top = STREAM_TOP;
        let bottom: number;
        let thin = 1;
        if (p < FALL) {
          bottom = STREAM_TOP + (surfaceY(i, 0) - STREAM_TOP) * easeIn(p / FALL);
        } else if (p < FALL + FILL) {
          a.fills[i] = easeOut((p - FALL) / FILL);
          bottom = surfaceY(i, a.fills[i]);
          a.ripple[i] = 1;
        } else if (p < FALL + FILL + LIFT) {
          a.fills[i] = 1;
          const u = (p - FALL - FILL) / LIFT;
          bottom = surfaceY(i, 1);
          top = STREAM_TOP + (bottom - STREAM_TOP) * easeIn(u);
          thin = 1 - u * 0.6;
        } else {
          a.fills[i] = 1;
          bottom = top = 0;
          a.pourIdx = -1;
          if (i === 0) a.artT = t;
        }
        if (stream) {
          const len = top - bottom;
          stream.visible = len > 0.001;
          stream.position.set(0, top, RING);
          const rad = VESSELS[i].streamRadius * thin;
          stream.scale.set(rad, Math.max(0.001, len), rad);
        }
      } else if (stream) stream.visible = false;
    } else if (stream) stream.visible = false;
    R.streamMat.uniforms.uTime.value = t;

    // latte art blooms once the latte is poured
    if (!reduced && a.artT >= 0) a.art = Math.min(1, (t - a.artT) / ART);
    R.surfaceMats[0].uniforms.uArt.value = a.art;

    /* ---------- liquids follow their fill level */
    let rippling = false;
    for (let i = 0; i < MENU_COUNT; i++) {
      const fill = a.fills[i];
      const surf = surfaceRefs.current[i];
      const v = VESSELS[i];
      if (surf) {
        surf.visible = fill > 0.002;
        const y = surfaceY(i, fill);
        surf.position.y = y;
        const rr = innerRadiusAt(v.shape, y - BASE_Y[i]) * 0.985;
        surf.scale.set(rr, 1, rr);
      }
      const liq = liquidRefs.current[i];
      if (liq) {
        liq.visible = fill > 0.002;
        liq.scale.y = Math.max(0.001, fill);
      }
      if (a.pourIdx !== i) a.ripple[i] *= Math.exp(-dt * 2.2);
      if (a.ripple[i] < 0.01) a.ripple[i] = 0;
      else rippling = true;
      const u = R.surfaceMats[i].uniforms;
      u.uRipple.value = a.ripple[i];
      u.uTime.value = t;
    }

    /* ---------- steam rises from the front cup when it holds something hot */
    const front = VESSELS[stage.active];
    const steamTarget = front.hot && a.fills[stage.active] > 0.35 && settled ? 1 : 0;
    a.steam = reduced ? steamTarget : a.steam + (steamTarget - a.steam) * (1 - Math.exp(-dt * 2.5));
    if (Math.abs(steamTarget - a.steam) < 0.005) a.steam = steamTarget;
    const su = R.steamMat.uniforms;
    su.uOpacity.value = a.steam;
    su.uTime.value = reduced ? 3.7 : t;
    su.uViewportH.value = h * state.viewport.dpr;
    su.uOrigin.value.set(0, BASE_Y[stage.active] + front.shape.fillTop + 0.02, RING);
    su.uRadius.value = innerRadiusAt(front.shape, front.shape.fillTop) * 0.55;
    if (steamRef.current) steamRef.current.visible = a.steam > 0.002;

    /* ---------- beans orbit the front cup, widening to circle the tray */
    const beans = beansRef.current;
    if (beans && !reduced) {
      const o = tmp.obj;
      tmp.orbitCenter.set(0, 0.0, RING * (1 - k));
      const spread = 0.8 + k * 1.75;
      for (let i = 0; i < beanParams.length; i++) {
        const b = beanParams[i];
        const ang = b.phase + t * b.speed * (1 - k * 0.45);
        const rr = b.ring * spread;
        const lx = Math.cos(ang) * rr;
        const lz = Math.sin(ang) * rr;
        const ly = b.y * (1 + k * 0.6) + Math.sin(ang * 2 + b.phase) * 0.04;
        // tilt the orbit plane around x
        const ct = Math.cos(b.tilt);
        const st = Math.sin(b.tilt);
        o.position.set(tmp.orbitCenter.x + lx, tmp.orbitCenter.y + ly * ct - lz * st * 0.35, tmp.orbitCenter.z + lz * ct + ly * st * 0.2);
        o.rotation.set(b.rx + t * b.spin, b.rz + t * b.spin * 0.6, 0);
        o.scale.setScalar(b.scale);
        o.updateMatrix();
        beans.setMatrixAt(i, o.matrix);
      }
      beans.instanceMatrix.needsUpdate = true;
    }

    /* ---------- keep the loop alive only while something is actually moving */
    const damping = a.hero !== heroTarget || a.angle !== target || (a.steam !== 0 && a.steam !== 1);
    const autonomous = !reduced && a.readyAt >= 0; // steam + orbiting beans
    const artMoving = a.art > 0 && a.art < 1;
    if (stage.visible && !document.hidden && (autonomous || pouring || damping || rippling || artMoving)) {
      state.invalidate();
    }
  });

  const r = res;
  return (
    <>
      <hemisphereLight args={["#ffe9c9", "#2a1b12", 0.7]} />
      <directionalLight position={[-3, 5, 4]} intensity={2.3} color="#ffdcae" />
      <directionalLight position={[3.5, 2.5, -4]} intensity={1.8} color="#e3a53c" />
      <pointLight position={[2.5, 1.6, 3.5]} intensity={tier === "low" ? 3 : 2} distance={10} color="#f2e5cf" />

      {/* warm pool of light under the tray */}
      <mesh geometry={r.plane} material={r.glowMat} position={[0, -0.25, 0]} scale={[10, 1, 10]} />

      <group ref={trayRef}>
        <mesh geometry={r.trayTop} material={[r.traySide, r.trayTopMat, r.traySide]} position={[0, -0.04, 0]} />
        <mesh geometry={r.rim} material={r.rimMat} position={[0, 0.005, 0]} rotation={[Math.PI / 2, 0, 0]} />

        {VESSELS.map((v, i) => {
          const ang = (i * Math.PI) / 2;
          const saucerGeo = r.saucers[i];
          const saucerMat = r.saucerMats[i];
          const liquidGeo = r.liquids[i];
          const liquidMat = r.liquidMats[i];
          return (
            <group key={i} position={[Math.sin(ang) * RING, 0, Math.cos(ang) * RING]} rotation={[0, ang, 0]}>
              <mesh
                geometry={r.plane}
                material={r.shadowMat}
                position={[0.04, 0.003, -0.03]}
                scale={[(v.saucer || v.shape.profile[1].x + 0.1) * 2.5, 1, (v.saucer || v.shape.profile[1].x + 0.1) * 2.5]}
              />
              {saucerGeo && saucerMat && <mesh geometry={saucerGeo} material={saucerMat} />}
              <mesh
                ref={(m) => {
                  surfaceRefs.current[i] = m;
                }}
                geometry={r.disc}
                material={r.surfaceMats[i]}
                visible={false}
                renderOrder={v.glass ? 2 : 0}
              />
              <group position={[0, BASE_Y[i], 0]}>
                {liquidGeo && liquidMat && (
                  <mesh
                    ref={(m) => {
                      liquidRefs.current[i] = m;
                    }}
                    geometry={liquidGeo}
                    material={liquidMat}
                    position={[0, v.shape.fillBottom, 0]}
                    renderOrder={1}
                  />
                )}
                {i === 3 &&
                  [
                    [0.06, 0.62, 0.05, 0.3],
                    [-0.07, 0.72, -0.03, 1.1],
                    [0.02, 0.48, -0.07, 2.2],
                    [-0.05, 0.84, 0.06, 0.7],
                  ].map(([x, y, z, ry], k) => (
                    <mesh key={k} geometry={r.ice} material={r.iceMat} position={[x, y, z]} rotation={[ry * 0.3, ry, ry * 0.2]} renderOrder={2} />
                  ))}
                <mesh geometry={r.bodies[i]} material={r.bodyMats[i]} renderOrder={v.glass ? 3 : 0} />
                {i === 0 && <mesh geometry={r.handle} material={r.handleMat} position={[0.47, 0.33, 0]} />}
              </group>
              {i === 1 && (
                <>
                  <mesh geometry={r.date} material={r.dateMat} position={[0.42, 0.085, 0.12]} rotation={[0, 0.5, 0]} scale={[0.04, 0.035, 0.08]} />
                  <mesh geometry={r.date} material={r.dateMat} position={[0.36, 0.085, -0.24]} rotation={[0, -0.9, 0]} scale={[0.04, 0.035, 0.08]} />
                </>
              )}
            </group>
          );
        })}

        {reduced && <instancedMesh ref={beansRef} args={[r.bean, r.beanMat, settings.beans]} />}
      </group>

      <mesh ref={streamRef} geometry={r.stream} material={r.streamMat} visible={false} frustumCulled={false} />
      <points ref={steamRef} geometry={r.steamGeo} material={r.steamMat} frustumCulled={false} renderOrder={4} />
      {!reduced && <instancedMesh ref={beansRef} args={[r.bean, r.beanMat, settings.beans]} frustumCulled={false} />}
    </>
  );
}
