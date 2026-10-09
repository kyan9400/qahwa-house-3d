import * as THREE from "three";

/*
  Every vessel is a lathe: a hand-written 2D profile (radius, height) spun around the Y axis.
  The outer wall and the inner wall are smoothed separately with a spline so the lip stays crisp.
*/

type P = [number, number];

function smooth(points: P[], divisions: number): THREE.Vector2[] {
  const curve = new THREE.SplineCurve(points.map(([x, y]) => new THREE.Vector2(x, y)));
  return curve.getPoints(divisions);
}

export interface VesselShape {
  /** full closed profile for the body */
  profile: THREE.Vector2[];
  /** inner wall, sorted bottom -> top, used for the liquid */
  inner: THREE.Vector2[];
  /** liquid surface height when full */
  fillTop: number;
  /** inner bottom height */
  fillBottom: number;
  /** total height of the vessel */
  height: number;
  /** lathe v coordinate where the lip begins (outer wall below, lip + inside above) */
  lipV: number;
}

function build(outer: P[], lip: P[], inner: P[], fillRatio: number, div = 24): VesselShape {
  const o = smooth(outer, div);
  const i = smooth(inner, div);
  const profile = [new THREE.Vector2(0, outer[0][1]), ...o, ...lip.map(([x, y]) => new THREE.Vector2(x, y)), ...i];
  const last = inner[inner.length - 1];
  profile.push(new THREE.Vector2(0, last[1]));
  const innerSorted = [...i].sort((a, b) => a.y - b.y);
  const fillBottom = innerSorted[0].y;
  const top = innerSorted[innerSorted.length - 1].y;
  return {
    profile,
    inner: innerSorted,
    fillBottom,
    fillTop: fillBottom + (top - fillBottom) * fillRatio,
    height: Math.max(...profile.map((p) => p.y)),
    lipV: (o.length + 1) / (profile.length - 1),
  };
}

/** Wide stoneware latte cup with a foot ring. */
export const LATTE = build(
  [
    [0.2, 0],
    [0.235, 0.012],
    [0.24, 0.045],
    [0.27, 0.09],
    [0.35, 0.2],
    [0.42, 0.33],
    [0.465, 0.46],
    [0.48, 0.55],
  ],
  [
    [0.482, 0.562],
    [0.47, 0.568],
    [0.458, 0.56],
  ],
  [
    [0.452, 0.5],
    [0.43, 0.39],
    [0.38, 0.27],
    [0.3, 0.16],
    [0.18, 0.09],
    [0.06, 0.075],
  ],
  0.86,
);

/** Small handleless finjan. */
export const FINJAN = build(
  [
    [0.13, 0],
    [0.15, 0.01],
    [0.155, 0.04],
    [0.2, 0.1],
    [0.25, 0.2],
    [0.28, 0.3],
    [0.295, 0.38],
  ],
  [
    [0.298, 0.39],
    [0.288, 0.394],
    [0.278, 0.386],
  ],
  [
    [0.272, 0.33],
    [0.25, 0.24],
    [0.2, 0.15],
    [0.12, 0.09],
    [0.04, 0.08],
  ],
  0.62,
);

/** Straight, slightly flared glass tumbler (pour-over serve). */
export const TUMBLER = build(
  [
    [0.27, 0],
    [0.285, 0.008],
    [0.29, 0.03],
    [0.3, 0.25],
    [0.32, 0.5],
    [0.335, 0.66],
  ],
  [
    [0.337, 0.668],
    [0.327, 0.672],
    [0.322, 0.664],
  ],
  [
    [0.318, 0.6],
    [0.302, 0.4],
    [0.29, 0.2],
    [0.28, 0.09],
    [0.05, 0.075],
  ],
  0.82,
);

/** Tall cold-brew glass. */
export const TALL = build(
  [
    [0.22, 0],
    [0.235, 0.01],
    [0.24, 0.05],
    [0.25, 0.4],
    [0.27, 0.8],
    [0.285, 1.0],
  ],
  [
    [0.287, 1.008],
    [0.277, 1.012],
    [0.272, 1.004],
  ],
  [
    [0.268, 0.9],
    [0.255, 0.6],
    [0.24, 0.3],
    [0.232, 0.12],
    [0.05, 0.1],
  ],
  0.86,
);

/** Saucer with a well for the cup. */
export function saucerProfile(radius: number): THREE.Vector2[] {
  const s = radius / 0.7;
  const pts: P[] = [
    [0, 0],
    [0.36, 0],
    [0.38, 0.012],
    [0.4, 0.02],
    [0.58, 0.05],
    [0.68, 0.08],
    [0.705, 0.092],
    [0.695, 0.1],
    [0.66, 0.09],
    [0.55, 0.066],
    [0.36, 0.046],
    [0.3, 0.036],
    [0, 0.034],
  ];
  return pts.map(([x, y]) => new THREE.Vector2(x * s, y * s));
}

export function lathe(profile: THREE.Vector2[], segments: number) {
  const g = new THREE.LatheGeometry(profile, segments);
  g.computeVertexNormals();
  return g;
}

/** Inner wall radius at a given height (linear interpolation along the inner profile). */
export function innerRadiusAt(shape: VesselShape, y: number): number {
  const pts = shape.inner;
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

/** Liquid body (for glass vessels): the inner wall, shrunk a hair, from the bottom up to the full line. */
export function liquidBody(shape: VesselShape, segments: number) {
  const pts: THREE.Vector2[] = [new THREE.Vector2(0, shape.fillBottom + 0.002)];
  const steps = 16;
  for (let k = 0; k <= steps; k++) {
    const y = shape.fillBottom + 0.002 + ((shape.fillTop - shape.fillBottom - 0.002) * k) / steps;
    pts.push(new THREE.Vector2(innerRadiusAt(shape, y) * 0.985, y));
  }
  const g = new THREE.LatheGeometry(pts, segments);
  // pivot at the bottom so scale.y fills it from the bottom
  g.translate(0, -shape.fillBottom, 0);
  g.computeVertexNormals();
  return g;
}

/** A coffee bean: ellipsoid with a crease pressed into its flat side. */
export function beanGeometry() {
  const g = new THREE.SphereGeometry(1, 18, 14);
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
