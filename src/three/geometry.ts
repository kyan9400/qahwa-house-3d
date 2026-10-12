import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/*
  Every vessel is a lathe: a hand-written 2D profile (radius, height) spun around the Y axis.
  LatheGeometry computes smooth analytic normals from the profile, so we never call computeVertexNormals
  (that averaged the duplicated seam vertices separately and left a visible seam at u = 0/1).
  A point listed twice in a profile gives a crisp crease there (foot ring, saucer underside); everything
  else stays smooth: spline walls, a real semicircular lip and a small fillet at the foot.
*/

type P = [number, number];
/** a profile point; `crisp` emits it twice so the lathe normals break cleanly there */
type Q = [number, number, crisp?: 1];

function smooth(points: P[], divisions: number): THREE.Vector2[] {
  const curve = new THREE.SplineCurve(points.map(([x, y]) => new THREE.Vector2(x, y)));
  return curve.getPoints(divisions);
}

function emit(points: Q[]): THREE.Vector2[] {
  const out: THREE.Vector2[] = [];
  for (const [x, y, crisp] of points) {
    out.push(new THREE.Vector2(x, y));
    if (crisp) out.push(new THREE.Vector2(x, y));
  }
  return out;
}

/** Rounded lip: the 7 inner points of a 9-point semicircle from the outer top over to the inner top. */
export function lipArc(outerTop: THREE.Vector2, innerTop: THREE.Vector2): THREE.Vector2[] {
  const cx = (outerTop.x + innerTop.x) / 2;
  const cy = (outerTop.y + innerTop.y) / 2;
  const r = outerTop.distanceTo(innerTop) / 2;
  const a0 = Math.atan2(outerTop.y - cy, outerTop.x - cx);
  const pts: THREE.Vector2[] = [];
  for (let k = 1; k < 8; k++) {
    const a = a0 + (Math.PI * k) / 8;
    pts.push(new THREE.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
  }
  return pts;
}

/** Quarter-circle fillet from the flat base (at x0, y=0) up into the wall (4 points; the wall starts at the 5th). */
function fillet(x0: number, r: number): Q[] {
  const pts: Q[] = [];
  for (let k = 0; k < 4; k++) {
    const a = -Math.PI / 2 + (Math.PI / 2) * (k / 4);
    pts.push([x0 + Math.cos(a) * r, r + Math.sin(a) * r]);
  }
  return pts;
}

export interface VesselSpec {
  /** recessed base: [inner radius, recess height, foot ring radius]; null = flat glass base */
  foot: [number, number, number] | null;
  /** where the flat base turns into the fillet, and the fillet radius */
  filletX: number;
  filletR: number;
  /** outer wall control points, bottom -> top (first = fillet end, last = outer lip top) */
  outer: P[];
  /** inner wall control points, top -> bottom (first = inner lip top) */
  inner: P[];
  fillRatio: number;
}

export interface VesselShape {
  /** full closed profile for the body */
  profile: THREE.Vector2[];
  /** outer wall samples, bottom -> top */
  outer: THREE.Vector2[];
  /** inner wall, sorted bottom -> top, used for the liquid */
  inner: THREE.Vector2[];
  /** liquid surface height when full */
  fillTop: number;
  /** inner bottom height */
  fillBottom: number;
  /** total height of the vessel */
  height: number;
  /** lathe v where the outer wall starts (the foot is below) */
  footV: number;
  /** lathe v where the lip begins (outer wall below, lip + inside above) */
  lipV: number;
  /** lathe v where the inside wall begins */
  innerV: number;
}

export function vesselShape(spec: VesselSpec, div = 24): VesselShape {
  const base: Q[] = spec.foot
    ? [
        [0, spec.foot[1]],
        [spec.foot[0], spec.foot[1], 1],
        [spec.foot[2], 0, 1],
      ]
    : [[0, 0]];
  const foot = emit([...base, ...fillet(spec.filletX, spec.filletR)]);
  const o = smooth(spec.outer, div);
  // the inside wall is only seen from above (or through glass): half the samples keeps the triangle budget
  const i = smooth(spec.inner, Math.max(12, Math.round(div * 0.5)));
  const lip = lipArc(o[o.length - 1], i[0]);
  const last = spec.inner[spec.inner.length - 1];
  const profile = [...foot, ...o, ...lip, ...i, new THREE.Vector2(0, last[1])];
  const innerSorted = [...i].sort((a, b) => a.y - b.y);
  const fillBottom = innerSorted[0].y;
  const top = innerSorted[innerSorted.length - 1].y;
  const n = profile.length - 1;
  return {
    profile,
    outer: o,
    inner: innerSorted,
    fillBottom,
    fillTop: fillBottom + (top - fillBottom) * spec.fillRatio,
    height: Math.max(...profile.map((p) => p.y)),
    footV: foot.length / n,
    lipV: (foot.length + o.length) / n,
    innerV: (foot.length + o.length + lip.length) / n,
  };
}

export const VESSEL_SPECS: Record<"latte" | "finjan" | "tumbler" | "tall", VesselSpec> = {
  /** Wide stoneware latte cup with a recessed foot ring. */
  latte: {
    foot: [0.17, 0.012, 0.185],
    filletX: 0.21,
    filletR: 0.03,
    outer: [
      [0.24, 0.03],
      [0.247, 0.055],
      [0.27, 0.09],
      [0.35, 0.2],
      [0.42, 0.33],
      [0.465, 0.46],
      [0.481, 0.556],
    ],
    inner: [
      [0.455, 0.556],
      [0.447, 0.5],
      [0.415, 0.39],
      [0.355, 0.27],
      [0.275, 0.16],
      [0.17, 0.095],
      [0.06, 0.078],
    ],
    fillRatio: 0.86,
  },
  /** Small handleless finjan. */
  finjan: {
    foot: [0.11, 0.008, 0.12],
    filletX: 0.135,
    filletR: 0.02,
    outer: [
      [0.155, 0.02],
      [0.16, 0.045],
      [0.2, 0.1],
      [0.25, 0.2],
      [0.28, 0.3],
      [0.296, 0.386],
    ],
    inner: [
      [0.278, 0.386],
      [0.272, 0.33],
      [0.25, 0.24],
      [0.2, 0.15],
      [0.12, 0.09],
      [0.04, 0.08],
    ],
    fillRatio: 0.62,
  },
  /** Straight, slightly flared glass tumbler (pour-over serve). */
  tumbler: {
    foot: null,
    filletX: 0.27,
    filletR: 0.02,
    outer: [
      [0.29, 0.02],
      [0.293, 0.06],
      [0.3, 0.25],
      [0.32, 0.5],
      [0.336, 0.666],
    ],
    inner: [
      [0.322, 0.666],
      [0.318, 0.6],
      [0.302, 0.4],
      [0.29, 0.2],
      [0.28, 0.09],
      [0.05, 0.075],
    ],
    fillRatio: 0.82,
  },
  /** Tall cold-brew glass. */
  tall: {
    foot: null,
    filletX: 0.22,
    filletR: 0.02,
    outer: [
      [0.24, 0.02],
      [0.242, 0.06],
      [0.25, 0.4],
      [0.27, 0.8],
      [0.286, 1.004],
    ],
    inner: [
      [0.272, 1.004],
      [0.268, 0.9],
      [0.255, 0.6],
      [0.24, 0.3],
      [0.232, 0.12],
      [0.05, 0.1],
    ],
    fillRatio: 0.86,
  },
};

// layout metrics (fill heights, radii); the meshes are rebuilt per tier with more profile samples
export const LATTE = vesselShape(VESSEL_SPECS.latte);
export const FINJAN = vesselShape(VESSEL_SPECS.finjan);
export const TUMBLER = vesselShape(VESSEL_SPECS.tumbler);
export const TALL = vesselShape(VESSEL_SPECS.tall);

/** Saucer with a well for the cup: crisp foot ring underneath, rounded rim on top. */
export function saucerProfile(radius: number): THREE.Vector2[] {
  const s = radius / 0.7;
  const under = smooth(
    [
      [0.38, 0.012],
      [0.4, 0.02],
      [0.58, 0.05],
      [0.68, 0.078],
      [0.702, 0.088],
    ],
    12,
  );
  const top = smooth(
    [
      [0.684, 0.095],
      [0.66, 0.091],
      [0.55, 0.068],
      [0.42, 0.05],
      [0.34, 0.044],
      [0.3, 0.036],
    ],
    12,
  );
  const pts = [
    ...emit([
      [0, 0],
      [0.36, 0, 1],
    ]),
    ...under,
    ...lipArc(under[under.length - 1], top[0]),
    ...top,
    new THREE.Vector2(0, 0.034),
  ];
  return pts.map((p) => p.multiplyScalar(s));
}

/** Walnut tray: recessed foot, 45° chamfered underside, a raised rounded lip and a fillet into the floor.
    The floor itself is a separate flat disc so the wood grain stays planar. */
export function trayProfile(): THREE.Vector2[] {
  const body = emit([
    [0, -0.062],
    [1.52, -0.062, 1],
    [1.535, -0.075, 1],
    [1.995, -0.075, 1],
    [2.04, -0.03, 1],
    [2.04, 0.035],
  ]);
  const outerTop = body[body.length - 1];
  const innerTop = new THREE.Vector2(1.98, 0.035);
  const floor: THREE.Vector2[] = [innerTop, new THREE.Vector2(1.98, 0.014)];
  // fillet from the inner wall down into the floor (radius 0.014)
  for (let k = 1; k <= 4; k++) {
    const a = (-Math.PI / 2) * (k / 4);
    floor.push(new THREE.Vector2(1.966 + Math.cos(a) * 0.014, 0.014 + Math.sin(a) * 0.014));
  }
  return [...body, ...lipArc(outerTop, innerTop), ...floor];
}

export function lathe(profile: THREE.Vector2[], segments: number) {
  return new THREE.LatheGeometry(profile, segments);
}

/** Radius of a sorted wall (bottom -> top) at a given height (linear interpolation). */
function radiusAt(pts: THREE.Vector2[], y: number): number {
  if (y <= pts[0].y) return pts[0].x;
  for (let k = 1; k < pts.length; k++) {
    if (pts[k].y >= y) {
      const a = pts[k - 1];
      const b = pts[k];
      const t = (y - a.y) / Math.max(1e-6, b.y - a.y);
      return a.x + (b.x - a.x) * t;
    }
  }
  return pts[pts.length - 1].x;
}

/** Inner wall radius at a given height. */
export function innerRadiusAt(shape: VesselShape, y: number): number {
  return radiusAt(shape.inner, y);
}

/** Liquid body (for glass vessels): the inner wall, shrunk a hair, from the bottom up to the full line. */
export function liquidBody(shape: VesselShape, segments: number) {
  const y0 = shape.fillBottom + 0.002;
  const pts: THREE.Vector2[] = [new THREE.Vector2(0, y0)];
  const steps = 16;
  for (let k = 0; k <= steps; k++) {
    const y = y0 + ((shape.fillTop - y0) * k) / steps;
    pts.push(new THREE.Vector2(innerRadiusAt(shape, y) * 0.985, y));
    // crisp bottom edge
    if (k === 0) pts.push(pts[pts.length - 1].clone());
  }
  const g = new THREE.LatheGeometry(pts, segments);
  // pivot at the bottom so scale.y fills it from the bottom
  g.translate(0, -shape.fillBottom, 0);
  return g;
}

/**
  A tube along a curve whose radius follows `taper(t)` (t = 0..1 along the curve).
  Built from TubeGeometry, then every ring is scaled around its own centre point.
*/
export function taperedTube(
  curve: THREE.Curve<THREE.Vector3>,
  tubular: number,
  radius: number,
  radial: number,
  taper: (t: number) => number,
) {
  const g = new THREE.TubeGeometry(curve, tubular, radius, radial, false);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const c = new THREE.Vector3();
  const v = new THREE.Vector3();
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular;
    curve.getPointAt(t, c);
    const s = taper(t);
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      v.fromBufferAttribute(pos, k).sub(c).multiplyScalar(s).add(c);
      pos.setXYZ(k, v.x, v.y, v.z);
    }
  }
  pos.needsUpdate = true;
  return g;
}

const v3 = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);

/**
  The latte cup's C-shaped ear: a tapered tube whose two ends sit just inside the wall, plus a small sphere
  on the wall at each joint. Built in cup space from the actual wall radii, so it never pokes through inside.
*/
export function cupHandle(shape: VesselShape) {
  const outerAt = (y: number) => radiusAt(shape.outer, y);
  // outward wall normal (x, y) at height y; the wall flares, so it tilts downward
  const normalAt = (y: number) => {
    const slope = (outerAt(y + 0.01) - outerAt(y - 0.01)) / 0.02;
    return new THREE.Vector2(1, -slope).normalize();
  };
  // wall thickness measured along that normal
  const wall = (y: number) => (outerAt(y) - innerRadiusAt(shape, y)) * normalAt(y).x;
  const yu = 0.45;
  const yl = 0.22;
  const ru = outerAt(yu);
  const rl = outerAt(yl);
  const nu = normalAt(yu);
  const nl = normalAt(yl);
  const du = Math.min(0.01, wall(yu) * 0.4);
  const dl = Math.min(0.01, wall(yl) * 0.4);
  // each end sits du inside the wall and leaves along the wall normal (the extra guide point sets that
  // tangent), so the open end ring lies parallel to the surface and stays buried all the way round
  const eu = v3(ru - nu.x * du, yu - nu.y * du);
  const el = v3(rl - nl.x * dl, yl - nl.y * dl);
  const curve = new THREE.CatmullRomCurve3([
    eu,
    v3(eu.x + nu.x * 0.03, eu.y + nu.y * 0.03),
    v3(ru + 0.08, yu + 0.012),
    v3(ru + 0.14, yu - 0.035),
    v3(ru + 0.145, yu - 0.15),
    v3(rl + 0.12, yl + 0.005),
    v3(el.x + nl.x * 0.03, el.y + nl.y * 0.03),
    el,
  ]);
  const R = 0.032;
  const taper = (t: number) => 0.75 + 0.25 * Math.sin(Math.PI * t);
  const tube = taperedTube(curve, 56, R, 12, taper);
  const end = R * 0.75;
  // the joint spheres never reach through to the inside of the cup
  const su = Math.min(end * 1.1, wall(yu) * 0.85);
  const sl = Math.min(end * 1.1, wall(yl) * 0.85);
  const a = new THREE.SphereGeometry(su, 12, 8).translate(ru, yu, 0);
  const b = new THREE.SphereGeometry(sl, 12, 8).translate(rl, yl, 0);
  const merged = mergeGeometries([tube, a, b]);
  tube.dispose();
  a.dispose();
  b.dispose();
  return merged ?? new THREE.BufferGeometry();
}

/**
  One brass loop handle for the tray (built for the +x side; the second is the same mesh turned 180°):
  a tube half-ring standing on two short posts that rest on the brass rim.
*/
export function trayHandle() {
  const pts: THREE.Vector3[] = [];
  for (let k = 0; k <= 8; k++) {
    const th = (Math.PI * k) / 8;
    pts.push(v3(2.0 + 0.22 * Math.sin(th), 0.098 + 0.03 * Math.sin(th), -0.2 * Math.cos(th)));
  }
  const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.013, 8, false);
  // posts stand on the rim's centre line (radius 2.01 at z = ±0.2 is x = 2.0). Their base sits just inside the
  // rim tube (no visible gap on its curved top). Their tops (y 0.118) clear the tube end ring (top at 0.111),
  // so the open tube ends stay hidden inside the posts.
  const postA = new THREE.CylinderGeometry(0.02, 0.022, 0.062, 12).translate(2.0, 0.087, -0.2);
  const postB = new THREE.CylinderGeometry(0.02, 0.022, 0.062, 12).translate(2.0, 0.087, 0.2);
  const merged = mergeGeometries([tube, postA, postB]);
  tube.dispose();
  postA.dispose();
  postB.dispose();
  return merged ?? new THREE.BufferGeometry();
}

/* ------------------------------------------------------------------ dallah */

/** Height of the point the dallah tilts around (its body centre). */
export const DALLAH_PIVOT_Y = 0.3;
/** Spout tip, in dallah space (the spout points along +x). */
export const DALLAH_TIP = new THREE.Vector3(0.5, 0.67, 0);

/** Brass dallah: belly, crescent waist, flared rim, domed lid with a stepped finial. */
export function dallahProfile(div: number): THREE.Vector2[] {
  const foot = emit([[0, 0.008], [0.15, 0.008, 1], [0.165, 0, 1], ...fillet(0.185, 0.02)]);
  const body = smooth(
    [
      [0.205, 0.02],
      [0.228, 0.06],
      [0.245, 0.13],
      [0.232, 0.21],
      [0.185, 0.29],
      [0.128, 0.37],
      [0.102, 0.44],
      [0.108, 0.5],
      [0.135, 0.56],
      [0.172, 0.6],
    ],
    div,
  );
  const lidStart = new THREE.Vector2(0.156, 0.6);
  const lid = smooth(
    [
      [0.15, 0.598],
      [0.14, 0.625],
      [0.11, 0.665],
      [0.065, 0.692],
      [0.032, 0.7],
    ],
    Math.round(div * 0.4),
  );
  const finialSteps = emit([
    [0.032, 0.7, 1],
    [0.032, 0.718, 1],
    [0.052, 0.722],
    [0.052, 0.738, 1],
    [0.024, 0.744, 1],
  ]);
  const ball = smooth(
    [
      [0.02, 0.76],
      [0.038, 0.79],
      [0.044, 0.815],
      [0.034, 0.84],
      [0.012, 0.855],
    ],
    Math.round(div * 0.4),
  );
  return [
    ...foot,
    ...body,
    ...lipArc(body[body.length - 1], lidStart),
    lidStart,
    lid[0].clone(), // the lid seam: crisp
    ...lid,
    ...finialSteps.slice(1),
    ...ball,
    new THREE.Vector2(0, 0.858),
  ];
}

/** The long beaked spout (rooted below the waist) and the C-handle on the back, merged into one brass mesh. */
export function dallahFittings() {
  const spoutCurve = new THREE.CatmullRomCurve3([
    v3(0.1, 0.17),
    v3(0.25, 0.21),
    v3(0.33, 0.32),
    v3(0.37, 0.47),
    v3(0.41, 0.6),
    v3(0.47, 0.665),
    DALLAH_TIP.clone(),
  ]);
  const spout = taperedTube(spoutCurve, 56, 0.045, 12, (t) => 1 - 0.68 * Math.pow(t, 0.7));
  const handleCurve = new THREE.CatmullRomCurve3([
    v3(-0.095, 0.525),
    v3(-0.2, 0.565),
    v3(-0.31, 0.5),
    v3(-0.33, 0.36),
    v3(-0.28, 0.2),
    v3(-0.21, 0.14),
  ]);
  const handle = taperedTube(handleCurve, 40, 0.018, 8, (t) => 0.75 + 0.25 * Math.sin(Math.PI * t));
  const merged = mergeGeometries([spout, handle]);
  spout.dispose();
  handle.dispose();
  return merged ?? new THREE.BufferGeometry();
}

/** A coffee bean: ellipsoid with a crease pressed into its flat side. */
export function beanGeometry() {
  const g = new THREE.SphereGeometry(1, 16, 12);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let k = 0; k < pos.count; k++) {
    v.fromBufferAttribute(pos, k);
    // flatten the top a little
    if (v.y > 0) v.y *= 0.62;
    // the crease: a groove running along z on the flat side, slightly S-shaped
    const cx = v.x - Math.sin(v.z * 2.2) * 0.12;
    if (v.y > 0) v.y -= 0.34 * Math.exp(-(cx * cx) / 0.018) * (1 - v.z * v.z * 0.6);
    v.set(v.x * 0.068, v.y * 0.05, v.z * 0.095);
    pos.setXYZ(k, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** A green cardamom pod: a spindle with three soft ribs and pointed ends (long axis = z). */
export function cardamomGeometry() {
  const g = new THREE.SphereGeometry(1, 14, 10);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let k = 0; k < pos.count; k++) {
    v.fromBufferAttribute(pos, k);
    const a = Math.atan2(v.y, v.x);
    const rib = 1 + 0.12 * Math.cos(a * 3);
    const r = Math.sqrt(v.x * v.x + v.y * v.y);
    // pointed ends: the radius falls off faster than a sphere's toward the tips
    const want = rib * Math.pow(Math.max(0, 1 - v.z * v.z), 0.8);
    const s = r > 1e-5 ? want / r : 0;
    v.set(v.x * s * 0.034, v.y * s * 0.034, v.z * 0.068);
    pos.setXYZ(k, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** A Medjool date: a slightly flattened, wrinkled long ellipsoid (long axis = z). */
export function dateGeometry() {
  const g = new THREE.SphereGeometry(1, 20, 14);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let k = 0; k < pos.count; k++) {
    v.fromBufferAttribute(pos, k);
    const wr = 1 + 0.035 * Math.sin(v.z * 23 + Math.atan2(v.y, v.x) * 2) + 0.02 * Math.sin(v.z * 41 + v.x * 9);
    v.set(v.x * 0.055 * wr, v.y * 0.046 * wr * (v.y < 0 ? 0.8 : 1), v.z * 0.1 * (1 - 0.06 * v.x));
    pos.setXYZ(k, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** A shallow round dish (for the dates on the table). */
export function dishProfile(radius: number): THREE.Vector2[] {
  const s = radius / 0.4;
  const pts = [
    ...emit([
      [0, 0],
      [0.2, 0, 1],
    ]),
    ...smooth(
      [
        [0.22, 0.01],
        [0.33, 0.04],
        [0.4, 0.075],
      ],
      8,
    ),
    ...smooth(
      [
        [0.385, 0.08],
        [0.3, 0.052],
        [0.18, 0.032],
      ],
      8,
    ),
    new THREE.Vector2(0, 0.03),
  ];
  return pts.map((p) => p.multiplyScalar(s));
}
