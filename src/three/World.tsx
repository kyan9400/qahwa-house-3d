"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Tier, TierSettings } from "@/lib/quality";
import { nextTask } from "@/lib/schedule";
import { MENU_COUNT, stage } from "@/lib/stage-store";
import {
  DALLAH_PIVOT_Y,
  DALLAH_TIP,
  FINJAN,
  LATTE,
  TALL,
  TUMBLER,
  VESSEL_SPECS,
  beanGeometry,
  cupHandle,
  dallahFittings,
  dallahProfile,
  innerRadiusAt,
  lathe,
  liquidBody,
  saucerProfile,
  trayHandle,
  trayProfile,
  vesselShape,
  type VesselShape,
  type VesselSpec,
} from "./geometry";
import {
  cremaTexture,
  glazeRoughTexture,
  radialTexture,
  speckleTexture,
  stripTexture,
  woodTexture,
} from "./textures";
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
const KEY_LIGHT = new THREE.Vector3(-3, 5, 4);

// the dallah pour (qahwa only)
const DALLAH_TRAVEL = 0.85; // s, lift (0.35) + glide and tilt (0.5)
const DALLAH_LIFT_SHARE = 0.35 / DALLAH_TRAVEL;
const DALLAH_RISE = 0.35;
const DALLAH_TILT = (38 * Math.PI) / 180;
const INTRO = 1.4; // s, lights switching on
const SWEEP = 0.9; // s, highlight sweep when a drink settles

interface VesselDef {
  shape: VesselShape;
  spec: VesselSpec;
  hot: boolean;
  glass: boolean;
  saucer: number; // saucer radius, 0 = none
  liquid: string;
  stream: string;
  streamRadius: number;
  bodyOpacity: number;
}

const VESSELS: VesselDef[] = [
  { shape: LATTE, spec: VESSEL_SPECS.latte, hot: true, glass: false, saucer: 0.7, liquid: "#8a5530", stream: "#3a1c0b", streamRadius: 0.03, bodyOpacity: 1 },
  { shape: FINJAN, spec: VESSEL_SPECS.finjan, hot: true, glass: false, saucer: 0.55, liquid: "#a8742c", stream: "#8c5a1c", streamRadius: 0.02, bodyOpacity: 1 },
  { shape: TUMBLER, spec: VESSEL_SPECS.tumbler, hot: true, glass: true, saucer: 0, liquid: "#7a3313", stream: "#5e260c", streamRadius: 0.026, bodyOpacity: 0.86 },
  { shape: TALL, spec: VESSEL_SPECS.tall, hot: false, glass: true, saucer: 0, liquid: "#24110a", stream: "#2a140a", streamRadius: 0.028, bodyOpacity: 0.95 },
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

/** Builds every geometry, painted texture and material, yielding to the browser between the heavy steps. */
export async function createResources(settings: TierSettings) {
  const seg = settings.segments;
  const div = settings.profileDiv;
  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(x: T) => {
    disposables.push(x);
    return x;
  };

  // vessel meshes are rebuilt with this tier's profile smoothness (layout metrics stay the same)
  const shapes = VESSELS.map((v) => vesselShape(v.spec, div));
  const bodies = shapes.map((s) => keep(lathe(s.profile, seg)));
  const saucers = VESSELS.map((v) => (v.saucer ? keep(lathe(saucerProfile(v.saucer), seg)) : null));
  const liquids = VESSELS.map((v, i) => (v.glass ? keep(liquidBody(shapes[i], Math.round(seg * 0.75))) : null));
  const disc = keep(new THREE.CircleGeometry(1, Math.round(seg * 0.75)).rotateX(-Math.PI / 2));
  const handle = keep(cupHandle(shapes[0]));
  const stream = keep(new THREE.CylinderGeometry(1, 0.85, 1, 14, 24, true).translate(0, -0.5, 0));
  const bean = keep(beanGeometry());
  const ice = keep(new THREE.BoxGeometry(0.15, 0.13, 0.15, 1, 1, 1));
  const date = keep(new THREE.SphereGeometry(1, 16, 12));
  const plane = keep(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2));

  await nextTask();

  // the tray: lathe body, flat planar-UV floor, brass rim and two brass loop handles
  const trayBody = keep(lathe(trayProfile(), Math.max(64, seg)));
  const trayFloor = keep(new THREE.CircleGeometry(1.972, Math.max(64, seg)).rotateX(-Math.PI / 2));
  const rim = keep(new THREE.TorusGeometry(2.01, 0.033, 12, Math.max(96, Math.round(seg * 1.5))));
  const trayHandleGeo = keep(trayHandle());

  await nextTask();

  // the dallah: brass lathe body + spout and handle tubes (one merged mesh)
  // fewer samples than the cups (it is smaller on screen): keeps it under ~10k triangles on high
  const dallahBody = keep(lathe(dallahProfile(Math.round(div * 0.6)), Math.min(seg, 64)));
  const dallahFit = keep(dallahFittings());

  await nextTask();

  // steam: positions are computed in the shader; the attribute only seeds them
  const steamGeo = keep(new THREE.BufferGeometry());
  const r = rng(42);
  const seeds = new Float32Array(settings.steam * 4);
  for (let k = 0; k < seeds.length; k++) seeds[k] = r();
  steamGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(settings.steam * 3), 3));
  steamGeo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
  steamGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 50);

  // textures (painted on canvas)
  await nextTask();
  const wood = woodTexture(settings.envSize ? 1024 : 512);
  keep(wood.map);
  keep(wood.rough);
  wood.map.wrapS = wood.map.wrapT = THREE.RepeatWrapping;
  await nextTask();
  const crema = keep(cremaTexture(settings.envSize >= 256 ? 512 : 256));
  const shadowTex = keep(radialTexture("rgba(12,6,2,0.75)", "rgba(12,6,2,0)"));
  const glowTex = keep(radialTexture("rgba(227,165,60,0.22)", "rgba(227,165,60,0)", 256));

  await nextTask();

  const latteShape = shapes[0];
  const finjanShape = shapes[1];
  // a v position a fraction of the way up a vessel's outer wall (0 = foot, 1 = lip)
  const wallV = (s: VesselShape, f: number) => s.footV + (s.lipV - s.footV) * f;
  const latteStrip = keep(
    stripTexture([
      [0, "#b48a64"],
      [latteShape.footV + 0.01, "#b48a64"],
      [latteShape.footV + 0.025, "#8f3a1b"],
      [wallV(latteShape, 0.93), "#a3461f"],
      [wallV(latteShape, 0.995), "#efe3cf"],
      [1, "#f1e6d4"],
    ]),
  );
  const finjanStrip = keep(
    stripTexture([
      [0, "#f3ede3"],
      [wallV(finjanShape, 0.7), "#f3ede3"],
      [wallV(finjanShape, 0.72), "#3f6a52"],
      [wallV(finjanShape, 0.77), "#3f6a52"],
      [wallV(finjanShape, 0.79), "#f3ede3"],
      [wallV(finjanShape, 0.88), "#f3ede3"],
      [wallV(finjanShape, 0.9), "#d49a36"],
      [finjanShape.innerV + 0.01, "#d49a36"],
      [finjanShape.innerV + 0.025, "#f5efe6"],
      [1, "#f5efe6"],
    ]),
  );

  // stoneware speckle (medium + high): roughness and bump in one painted map
  const speckled = settings.envSize > 0;
  const latteRough = speckled ? keep(glazeRoughTexture(latteShape.footV + 0.015)) : null;
  const saucerSpeckle = speckled ? keep(speckleTexture(256, 0.5)) : null;
  if (saucerSpeckle) saucerSpeckle.repeat.set(6, 2);

  await nextTask();

  const physical = settings.envSize >= 256;
  const glaze = (map: THREE.Texture, rough: number, roughMap: THREE.Texture | null) => {
    const params = {
      map,
      roughness: roughMap ? 1 : rough,
      roughnessMap: roughMap,
      bumpMap: roughMap,
      bumpScale: 0.4,
      side: THREE.DoubleSide,
    };
    return keep(
      physical
        ? new THREE.MeshPhysicalMaterial({ ...params, clearcoat: 0.6, clearcoatRoughness: 0.15 })
        : new THREE.MeshStandardMaterial(params),
    );
  };

  // high: real refractive glass (one opaque pre-pass); medium/low: thin transparent glass with a bright rim
  const glass = keep(
    settings.transmission
      ? new THREE.MeshPhysicalMaterial({
          color: "#ffffff",
          transmission: 1,
          thickness: 0.03,
          ior: 1.5,
          roughness: 0.04,
          metalness: 0,
          attenuationColor: new THREE.Color("#fff3e2"),
          attenuationDistance: 2,
          specularIntensity: 1,
          envMapIntensity: 1.6,
          side: THREE.DoubleSide,
          transparent: false,
        })
      : new THREE.MeshPhysicalMaterial({
          color: "#fff8ee",
          roughness: 0.06,
          metalness: 0,
          transparent: true,
          opacity: settings.envSize ? 0.2 : 0.3,
          side: THREE.DoubleSide,
          depthWrite: false,
          envMapIntensity: 2,
          specularIntensity: 1,
        }),
  );

  const bodyMats = [glaze(latteStrip, 0.38, latteRough), glaze(finjanStrip, 0.22, null), glass, glass];
  // saucer speckle averages 0.5, so roughness 0.7 / 0.5 give the old 0.35 / 0.25
  const saucerMat = (color: string, rough: number) =>
    keep(
      new THREE.MeshStandardMaterial({
        color,
        roughness: saucerSpeckle ? rough * 2 : rough,
        roughnessMap: saucerSpeckle,
        bumpMap: saucerSpeckle,
        bumpScale: 0.4,
      }),
    );
  const saucerMats = [saucerMat("#ede1cc", 0.35), saucerMat("#f3ede3", 0.25), null, null];
  const handleMat = keep(new THREE.MeshStandardMaterial({ color: "#9b4320", roughness: 0.38 }));

  // refractive glass only sees opaque objects, so with transmission the liquids inside are opaque too
  const seeThrough = !settings.transmission;
  const liquidMats = VESSELS.map((v) =>
    v.glass
      ? keep(
          new THREE.MeshStandardMaterial({
            color: v.liquid,
            roughness: 0.15,
            transparent: seeThrough,
            opacity: seeThrough ? v.bodyOpacity : 1,
            depthWrite: !seeThrough,
          }),
        )
      : null,
  );

  const surfaceMats = VESSELS.map((v, i) =>
    keep(
      new THREE.ShaderMaterial({
        vertexShader: surfaceVertex,
        fragmentShader: surfaceFragment,
        transparent: v.glass && seeThrough,
        depthWrite: !(v.glass && seeThrough),
        uniforms: {
          uColor: { value: new THREE.Color(i === 0 ? "#a96a3b" : v.liquid) },
          uMap: { value: crema },
          uUseMap: { value: i === 0 ? 1 : 0 },
          uArt: { value: 0 },
          uRipple: { value: 0 },
          uTime: { value: 0 },
          uOpacity: { value: v.glass && seeThrough ? Math.min(1, v.bodyOpacity + 0.08) : 1 },
          uLightDir: { value: KEY_LIGHT.clone().normalize() },
          uEnvColor: { value: new THREE.Color("#f6d9ae") },
        },
      }),
    ),
  );

  const streamMat = keep(
    new THREE.ShaderMaterial({
      vertexShader: streamVertex,
      fragmentShader: streamFragment,
      uniforms: {
        uColor: { value: new THREE.Color(VESSELS[0].stream) },
        uTime: { value: 0 },
        uBend: { value: 0 },
        uFrom: { value: new THREE.Vector3() },
        uTo: { value: new THREE.Vector3() },
        uRange: { value: new THREE.Vector2(0, 1) },
        uRadius: { value: 0.02 },
      },
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
    seeThrough
      ? new THREE.MeshPhysicalMaterial({
          color: "#f4efe8",
          roughness: 0.18,
          transparent: true,
          opacity: 0.42,
          depthWrite: false,
          envMapIntensity: 1.5,
        })
      : new THREE.MeshPhysicalMaterial({ color: "#d9d3ca", roughness: 0.08, clearcoat: 1, envMapIntensity: 1.6 }),
  );
  const dateMat = keep(new THREE.MeshStandardMaterial({ color: "#4f2312", roughness: 0.3 }));
  const traySide = keep(new THREE.MeshStandardMaterial({ color: "#3b2315", roughness: 0.55 }));
  // lacquered walnut floor: clearcoat on high, grain-driven roughness on medium/high
  const trayTopMat = keep(
    physical
      ? new THREE.MeshPhysicalMaterial({
          map: wood.map,
          roughness: 1,
          roughnessMap: wood.rough,
          clearcoat: 0.35,
          clearcoatRoughness: 0.3,
        })
      : new THREE.MeshStandardMaterial({
          map: wood.map,
          roughness: settings.envSize ? 1 : 0.5,
          roughnessMap: settings.envSize ? wood.rough : null,
        }),
  );
  // brass: brushed (anisotropic) on high; plain metal on medium; low has no environment map, so less metallic
  const brassMat = keep(
    physical
      ? new THREE.MeshPhysicalMaterial({
          color: "#c89a4a",
          metalness: 1,
          roughness: 0.32,
          anisotropy: 0.6,
          anisotropyRotation: Math.PI / 2,
          clearcoat: 0.2,
          side: THREE.DoubleSide,
        })
      : new THREE.MeshStandardMaterial({
          color: "#c89a4a",
          metalness: settings.envSize ? 1 : 0.55,
          roughness: settings.envSize ? 0.35 : 0.42,
          side: THREE.DoubleSide,
        }),
  );
  const shadowMat = keep(new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  const trayShadowMat = keep(
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.6 }),
  );
  const dallahShadowMat = keep(
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.85 }),
  );
  const glowMat = keep(new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false }));

  // high only: additive glow sprites (no post-processing pass)
  let glow: { spout: THREE.SpriteMaterial; rim: THREE.SpriteMaterial; halo: THREE.SpriteMaterial } | null = null;
  if (settings.glow) {
    const spriteTex = keep(radialTexture("rgba(255,196,110,0.9)", "rgba(255,196,110,0)", 128));
    const sprite = (opacity: number) =>
      keep(
        new THREE.SpriteMaterial({
          map: spriteTex,
          blending: THREE.AdditiveBlending,
          transparent: true,
          depthWrite: false,
          opacity,
        }),
      );
    glow = { spout: sprite(0.55), rim: sprite(0.4), halo: sprite(0) };
  }

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
    trayBody,
    trayFloor,
    rim,
    trayHandleGeo,
    dallahBody,
    dallahFit,
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
    brassMat,
    shadowMat,
    trayShadowMat,
    dallahShadowMat,
    glowMat,
    glow,
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}

export type Resources = Awaited<ReturnType<typeof createResources>>;

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
  /** built by Experience before the Canvas exists (see createResources) */
  res: Resources;
  settings: TierSettings;
  tier: Tier;
  reduced: boolean;
  onReady: () => void;
}

export default function World({ res, settings, tier, reduced, onReady }: WorldProps) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const getState = useThree((s) => s.get);

  // the frame loop writes uniforms through this ref (render-time values stay untouched)
  const live = useRef<Resources | null>(null);
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
  const dallahRef = useRef<THREE.Group>(null);
  const dallahShadowRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Sprite>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const keyRef = useRef<THREE.DirectionalLight>(null);
  const rimRef = useRef<THREE.DirectionalLight>(null);
  const pointRef = useRef<THREE.PointLight>(null);
  const spotRef = useRef<THREE.SpotLight>(null);

  const pointBase = tier === "low" ? 3 : 2;
  const startLight = reduced ? 1 : 0.15; // the lights switch on when the scene is revealed

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
    // dallah travel 0 (home) .. 1 (pouring pose), and the light sweep
    dal: 0,
    wasSettled: false,
    sweepT: -1,
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
  const tmp = useMemo(() => {
    // where the dallah stands to pour: its spout tip sits just above the finjan once tilted
    const finjanTop = BASE_Y[1] + FINJAN.height;
    const pourTip = new THREE.Vector3(-0.06, finjanTop + 0.26, RING);
    const tipArm = DALLAH_TIP.clone().sub(new THREE.Vector3(0, DALLAH_PIVOT_Y, 0));
    tipArm.applyAxisAngle(new THREE.Vector3(0, 0, 1), -DALLAH_TILT);
    return {
      camPos: new THREE.Vector3(),
      camTarget: new THREE.Vector3(),
      heroPos: new THREE.Vector3(0, 1.05, 3.0),
      // wide screens: pulled back and swung to the right of the cup so the whole cup, saucer and
      // orbiting beans sit in the right half and the copy column on the left stays over calm background
      heroWide: new THREE.Vector3(2.38, 1.8, 4.04),
      // portrait: the close-up, pulled back far enough to keep the rim and saucer in frame
      heroTall: new THREE.Vector3(0, 0.3 + 0.75 * 1.35, 1.2 + 1.8 * 1.35),
      heroMid: new THREE.Vector3(0, 1.05, 3.0),
      heroTarget: new THREE.Vector3(0, 0.3, RING),
      menuPos: new THREE.Vector3(0, 2.75, 5.5),
      menuTarget: new THREE.Vector3(0, 0.25, 0.3),
      orbitCenter: new THREE.Vector3(),
      obj: new THREE.Object3D(),
      pourTip,
      dallahPour: pourTip.clone().sub(tipArm),
      // low tier: the dallah stays at the centre, turned so its spout faces the front cup, and the arc
      // starts at its spout tip (DALLAH_TIP turned a quarter turn about y), never in mid-air
      lowFrom: new THREE.Vector3(0, DALLAH_TIP.y, DALLAH_TIP.x + 0.01),
    };
  }, []);

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
  // Baked in a task of its own (after a yield); the shader warm-up below waits for it.
  const envDone = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    if (!settings.envSize) {
      envDone.current = Promise.resolve();
      return;
    }
    let cancelled = false;
    let rt: THREE.WebGLRenderTarget | null = null;
    const s = getState().scene;
    envDone.current = nextTask().then(() => {
      if (cancelled) return;
      rt = bakeEnvironment(gl, settings.envSize);
      s.environment = rt.texture;
      s.environmentIntensity = reduced ? 0.85 : 0.2;
      invalidate();
    });
    return () => {
      cancelled = true;
      s.environment = null;
      rt?.dispose();
    };
  }, [gl, getState, settings.envSize, invalidate, reduced]);

  // The sweep light always aims at the drink at the front of the tray.
  useEffect(() => {
    const spot = spotRef.current;
    if (!spot) return;
    spot.target.position.set(0, 0.35, RING);
    spot.target.updateMatrixWorld();
  }, []);

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
    // yield before compiling: mounting the scene and baking the environment were tasks of their own
    envDone.current
      .then(() => nextTask())
      .then(() => (cancelled ? undefined : gl.compileAsync(scene, camera)))
      .then(reveal, reveal);
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

    /* ---------- intro: the lights switch on (15% -> 100%) as the scene is revealed */
    const intro = reduced ? 1 : a.readyAt < 0 ? 0 : easeOut((t - a.readyAt) / INTRO);
    const introMoving = !reduced && a.readyAt >= 0 && intro < 1;
    const lk = 0.15 + 0.85 * intro;
    if (hemiRef.current) hemiRef.current.intensity = 0.7 * lk;
    if (keyRef.current) keyRef.current.intensity = 2.3 * lk;
    if (rimRef.current) rimRef.current.intensity = 1.8 * lk;
    if (pointRef.current) pointRef.current.intensity = pointBase * lk;
    if (settings.envSize && state.scene.environment) state.scene.environmentIntensity = 0.2 + 0.65 * intro;

    /* ---------- camera: hero close-up -> tray view, framed around the copy */
    if (w !== a.vw || h !== a.vh) {
      a.vw = w;
      a.vh = h;
      const aspect = w / h;
      if (w >= 900 && aspect > 1.05) {
        cam.setViewOffset(w, h, -w * 0.25, 0, w, h);
        tmp.heroPos.copy(tmp.heroWide);
      } else if (aspect < 1) {
        cam.setViewOffset(w, h, 0, h * 0.17, w, h);
        tmp.heroPos.copy(tmp.heroTall);
      } else {
        cam.setViewOffset(w, h, -w * 0.08, h * 0.06, w, h);
        tmp.heroPos.copy(tmp.heroMid);
      }
      cam.updateProjectionMatrix();
    }
    const heroTarget = reduced ? (stage.heroProgress > 0.5 ? 1 : 0) : smoothstep(stage.heroProgress);
    a.hero = reduced ? heroTarget : a.hero + (heroTarget - a.hero) * (1 - Math.exp(-dt * 6));
    if (Math.abs(heroTarget - a.hero) < 1e-4) a.hero = heroTarget;
    const k = a.hero;
    const aspect = w / h;
    const far = aspect < 1 ? Math.pow(Math.min(2.1, 1 / aspect), 0.8) : 1;
    // the intro dollies the camera in by 6%
    const dolly = 1 + 0.06 * (1 - intro);
    tmp.camTarget.lerpVectors(tmp.heroTarget, tmp.menuTarget, k);
    tmp.camPos
      .lerpVectors(tmp.heroPos, tmp.menuPos, k)
      .sub(tmp.camTarget)
      .multiplyScalar(far * dolly)
      .add(tmp.camTarget);
    cam.position.copy(tmp.camPos);
    cam.lookAt(tmp.camTarget);

    /* ---------- tray: turn the active drink to the front */
    const target = (-stage.active * Math.PI) / 2;
    a.angle = reduced ? target : a.angle + (target - a.angle) * (1 - Math.exp(-dt * 4.2));
    if (Math.abs(target - a.angle) < 1e-4) a.angle = target;
    if (trayRef.current) trayRef.current.rotation.y = a.angle;
    const settled = Math.abs(target - a.angle) < 0.03;

    /* ---------- light sweep: a narrow spot crosses the vessel each time a drink settles at the front */
    if (!reduced && a.readyAt >= 0) {
      if (settled && !a.wasSettled) a.sweepT = t;
      a.wasSettled = settled;
    }
    let sweep = -1;
    if (a.sweepT >= 0) {
      const u = (t - a.sweepT) / SWEEP;
      if (u < 1) sweep = u;
      else a.sweepT = -1;
    }
    const spot = spotRef.current;
    if (spot) {
      spot.intensity = sweep >= 0 ? 26 * Math.sin(Math.PI * sweep) : 0;
      spot.position.x = sweep >= 0 ? -3.2 + 6.4 * smoothstep(sweep) : -3.2;
    }

    /* ---------- the pour (the qahwa arcs from the dallah's spout; the others fall straight from above) */
    const dallahOn = settings.dallahMotion && !reduced;
    const stream = streamRef.current;
    const su0 = R.streamMat.uniforms;
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
        su0.uColor.value.set(VESSELS[a.pourIdx].stream);
      }
      if (a.pourIdx >= 0) {
        pouring = true;
        const i = a.pourIdx;
        const arc = i === 1;
        if (arc && dallahOn && a.dal < 1) {
          // the dallah is still travelling into its pouring pose
          if (stream) stream.visible = false;
        } else {
          a.pourT += dt;
          const p = a.pourT;
          let top = STREAM_TOP;
          let bottom: number;
          let thin = 1;
          let from = 0;
          let to = 1;
          if (p < FALL) {
            const f = easeIn(p / FALL);
            bottom = STREAM_TOP + (surfaceY(i, 0) - STREAM_TOP) * f;
            to = f;
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
            from = easeIn(u);
          } else {
            a.fills[i] = 1;
            bottom = top = 0;
            from = to = 0;
            a.pourIdx = -1;
            if (i === 0) a.artT = t;
          }
          if (stream) {
            const rad = VESSELS[i].streamRadius * thin;
            if (arc) {
              su0.uBend.value = 1;
              su0.uFrom.value.copy(dallahOn ? tmp.pourTip : tmp.lowFrom);
              su0.uTo.value.set(0.03, surfaceY(i, a.fills[i]), RING);
              su0.uRange.value.set(from, to);
              su0.uRadius.value = rad;
              stream.visible = to - from > 0.001;
              stream.position.set(0, 0, 0);
              stream.scale.set(1, 1, 1);
            } else {
              su0.uBend.value = 0;
              const len = top - bottom;
              stream.visible = len > 0.001;
              stream.position.set(0, top, RING);
              stream.scale.set(rad, Math.max(0.001, len), rad);
            }
          }
        }
      } else if (stream) stream.visible = false;
    } else if (stream) stream.visible = false;
    su0.uTime.value = t;

    /* ---------- the dallah: lift (0.35 s), glide + tilt 38° (0.5 s), pour, then back to the centre */
    let dallahMoving = false;
    const dal = dallahRef.current;
    if (dal) {
      const want = dallahOn && a.pourIdx === 1 ? 1 : 0;
      if (a.dal !== want) {
        const step = dt / DALLAH_TRAVEL;
        a.dal = want > a.dal ? Math.min(1, a.dal + step) : Math.max(0, a.dal - step);
        dallahMoving = true;
      }
      const lift = smoothstep(a.dal / DALLAH_LIFT_SHARE);
      const glide = smoothstep((a.dal - DALLAH_LIFT_SHARE) / (1 - DALLAH_LIFT_SHARE));
      // first reveal: a short "welcome" nod as the lights come on
      let nod = 0;
      if (dallahOn && a.readyAt >= 0) {
        const u = (t - a.readyAt - 0.5) / 1.1;
        if (u > 0 && u < 1) {
          nod = Math.sin(Math.PI * u);
          dallahMoving = true;
        }
      }
      const hy = DALLAH_PIVOT_Y + DALLAH_RISE * lift;
      const P = tmp.dallahPour;
      dal.position.set(P.x * glide, hy + (P.y - hy) * glide, P.z * glide);
      dal.rotation.z = -DALLAH_TILT * glide - 0.21 * nod;
      const shadow = dallahShadowRef.current;
      if (shadow) {
        const height = Math.min(1, (dal.position.y - DALLAH_PIVOT_Y) / 0.5);
        shadow.position.set(dal.position.x + 0.03, 0.004, dal.position.z);
        const s = 0.75 * (1 + height * 0.5);
        shadow.scale.set(s, 1, s);
        R.dallahShadowMat.opacity = 0.85 * (1 - height * 0.75);
      }
    }

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
    // high tier: a faint warm halo behind the steam column
    const halo = haloRef.current;
    if (halo && R.glow) {
      R.glow.halo.opacity = 0.32 * a.steam;
      halo.visible = a.steam > 0.002;
      halo.position.set(0, su.uOrigin.value.y + 0.5, RING - 0.15);
    }

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
    const damping =
      a.hero !== heroTarget ||
      a.angle !== target ||
      (a.steam !== 0 && a.steam !== 1) ||
      introMoving ||
      sweep >= 0 ||
      dallahMoving;
    const autonomous = !reduced && a.readyAt >= 0; // steam + orbiting beans
    const artMoving = a.art > 0 && a.art < 1;
    if (stage.visible && !document.hidden && (autonomous || pouring || damping || rippling || artMoving)) {
      state.invalidate();
    }
  });

  const r = res;
  return (
    <>
      <hemisphereLight ref={hemiRef} args={["#ffe9c9", "#2a1b12", 0.7 * startLight]} />
      <directionalLight ref={keyRef} position={KEY_LIGHT.toArray()} intensity={2.3 * startLight} color="#ffdcae" />
      <directionalLight ref={rimRef} position={[3.5, 2.5, -4]} intensity={1.8 * startLight} color="#e3a53c" />
      <pointLight ref={pointRef} position={[2.5, 1.6, 3.5]} intensity={pointBase * startLight} distance={10} color="#f2e5cf" />
      {/* narrow sweep light (off until a drink settles at the front) */}
      <spotLight ref={spotRef} position={[-3.2, 2.2, 3.4]} angle={0.3} penumbra={0.85} intensity={0} distance={12} decay={2} color="#fff1dc" />

      {/* warm pool of light under the tray, and the tray's soft contact shadow on it */}
      <mesh geometry={r.plane} material={r.glowMat} position={[0, -0.25, 0]} scale={[10, 1, 10]} />
      <mesh geometry={r.plane} material={r.trayShadowMat} position={[0, -0.24, 0]} scale={[5.5, 1, 5.5]} renderOrder={1} />

      {/* high: brass rim glint. It sits in world space on the key-light side, so it stays put like a real
          highlight while the (round) tray turns underneath it */}
      {r.glow && <sprite material={r.glow.rim} position={[-1.2, 0.075, 1.61]} scale={0.5} renderOrder={5} />}

      <group ref={trayRef}>
        <mesh geometry={r.trayBody} material={r.traySide} />
        <mesh geometry={r.trayFloor} material={r.trayTopMat} />
        <mesh geometry={r.rim} material={r.brassMat} position={[0, 0.035, 0]} rotation={[Math.PI / 2, 0, 0]} />
        <mesh geometry={r.trayHandleGeo} material={r.brassMat} />
        <mesh geometry={r.trayHandleGeo} material={r.brassMat} rotation={[0, Math.PI, 0]} />

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
                {i === 0 && <mesh geometry={r.handle} material={r.handleMat} />}
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

      {/* the brass dallah: the tray's centrepiece, which lifts out to pour the qahwa (tilts around its body centre) */}
      <group ref={dallahRef} position={[0, DALLAH_PIVOT_Y, 0]} rotation={[0, settings.dallahMotion ? 0 : -Math.PI / 2, 0]}>
        <group position={[0, -DALLAH_PIVOT_Y, 0]}>
          <mesh geometry={r.dallahBody} material={r.brassMat} />
          <mesh geometry={r.dallahFit} material={r.brassMat} />
          {r.glow && (
            <sprite material={r.glow.spout} position={[DALLAH_TIP.x + 0.01, DALLAH_TIP.y, 0]} scale={0.16} renderOrder={5} />
          )}
        </group>
      </group>
      <mesh ref={dallahShadowRef} geometry={r.plane} material={r.dallahShadowMat} position={[0.03, 0.004, 0]} scale={[0.75, 1, 0.75]} />

      <mesh ref={streamRef} geometry={r.stream} material={r.streamMat} visible={false} frustumCulled={false} />
      <points ref={steamRef} geometry={r.steamGeo} material={r.steamMat} frustumCulled={false} renderOrder={4} />
      {r.glow && <sprite ref={haloRef} material={r.glow.halo} scale={[0.9, 1.4, 1]} visible={false} renderOrder={3} />}
      {!reduced && <instancedMesh ref={beansRef} args={[r.bean, r.beanMat, settings.beans]} frustumCulled={false} />}
    </>
  );
}
