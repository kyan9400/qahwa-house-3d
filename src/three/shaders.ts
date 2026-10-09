/* Custom shaders. Everything that moves autonomously is computed on the GPU from uTime. */

export const surfaceVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/** Liquid surface: colour or crema texture, ripple rings while pouring, a dark meniscus and a soft highlight. */
export const surfaceFragment = /* glsl */ `
uniform vec3 uColor;
uniform sampler2D uMap;
uniform float uUseMap;
uniform float uArt;
uniform float uRipple;
uniform float uTime;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  vec3 base = uColor;
  if (uUseMap > 0.5) {
    vec3 art = texture2D(uMap, vUv).rgb;
    base = mix(uColor, art, uArt);
  }
  float wave = sin(r * 46.0 - uTime * 13.0) * exp(-r * 2.6) * uRipple;
  base *= 1.0 + wave * 0.22;
  base *= mix(1.0, 0.62, smoothstep(0.8, 1.0, r));
  float spec = pow(max(0.0, 1.0 - length(p - vec2(-0.32, 0.38)) * 1.5), 5.0);
  base += vec3(1.0, 0.86, 0.66) * spec * 0.22 * (1.0 - uArt * 0.5);
  gl_FragColor = vec4(base, uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/** The pour: a thin cylinder with flow bands travelling down it and a bright fresnel edge. */
export const streamVertex = /* glsl */ `
uniform float uTime;
varying vec3 vN;
varying vec3 vView;
varying float vWorldY;
void main() {
  vec3 p = position;
  vec4 world = modelMatrix * vec4(p, 1.0);
  float wob = sin(world.y * 14.0 + uTime * 11.0) * 0.004 + sin(world.y * 31.0 - uTime * 7.0) * 0.002;
  world.x += wob;
  vWorldY = world.y;
  vec4 mv = viewMatrix * world;
  vN = normalize(mat3(viewMatrix) * mat3(modelMatrix) * normal);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

export const streamFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uTime;
varying vec3 vN;
varying vec3 vView;
varying float vWorldY;
void main() {
  float fres = 1.0 - abs(dot(normalize(vN), normalize(vView)));
  float bands = 0.82 + 0.18 * sin(vWorldY * 38.0 + uTime * 24.0) * sin(vWorldY * 11.0 + uTime * 9.0);
  vec3 col = uColor * bands;
  col += vec3(1.0, 0.78, 0.5) * pow(fres, 2.5) * 0.55;
  float core = pow(1.0 - fres, 6.0);
  col += uColor * core * 0.6;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/**
  Steam: every particle's whole life is a function of (seed, time) — rise, curl drift, grow, fade.
  No CPU work per frame beyond one uniform.
*/
export const steamVertex = /* glsl */ `
uniform float uTime;
uniform vec3 uOrigin;
uniform float uRadius;
uniform float uHeight;
uniform float uViewportH;
attribute vec4 aSeed;
varying float vAlpha;
void main() {
  float speed = 0.16 + aSeed.x * 0.12;
  float life = fract(uTime * speed + aSeed.y);
  float ang = aSeed.z * 6.2831853;
  float rad = sqrt(aSeed.w) * uRadius * (1.0 - life * 0.35);
  vec3 p = uOrigin + vec3(cos(ang) * rad, 0.0, sin(ang) * rad);
  p.y += life * uHeight;
  float swirl = uTime * 0.7 + aSeed.z * 6.2831853;
  p.x += sin(life * 4.0 + swirl) * 0.16 * life + sin(life * 9.0 + aSeed.y * 20.0) * 0.025;
  p.z += cos(life * 3.2 + swirl * 0.8) * 0.12 * life;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float worldSize = mix(0.05, 0.34, life) * (0.7 + aSeed.x * 0.6);
  gl_PointSize = worldSize * projectionMatrix[1][1] * uViewportH * 0.5 / -mv.z;
  vAlpha = smoothstep(0.0, 0.18, life) * (1.0 - smoothstep(0.45, 1.0, life));
}
`;

export const steamFragment = /* glsl */ `
uniform float uOpacity;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  a *= a;
  gl_FragColor = vec4(vec3(0.98, 0.93, 0.85), a * vAlpha * uOpacity * 0.22);
  #include <colorspace_fragment>
}
`;
