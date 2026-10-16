/*
  Real objects on the café table: photogrammetry scans from Poly Haven (CC0), see CREDITS.md.
  Each one is a meshopt-compressed .glb with WebP textures, served from this site's own /models folder and loaded
  together with the 3D chunk (never on the critical path). The models are normalised here (base on y = 0, centred,
  scaled to a height in scene units) so World only has to place them.
*/

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

// the GitHub Pages mirror is served under a base path
const BASE = process.env.NEXT_PUBLIC_GH_PAGES === "1" ? "/qahwa-house-3d" : "";

/** [file, height in scene units] (the tray is ~4 units across) */
const PROPS = {
  brassPot: ["brass_pot_01", 0.78],
  plate: ["carved_wooden_plate", 0.11],
  ceramicPot: ["ceramic_pot", 0.62],
} as const;

export type PropName = keyof typeof PROPS;

export interface Props {
  objects: Record<PropName, THREE.Group>;
  textures: THREE.Texture[];
  dispose: () => void;
}

/** Loads every prop in parallel. `metal` < 1 tones the brass down where there is no environment map to reflect. */
export async function loadProps(metal: number, shadows: boolean): Promise<Props> {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const names = Object.keys(PROPS) as PropName[];
  const scenes = await Promise.all(names.map((n) => loader.loadAsync(`${BASE}/models/${PROPS[n][0]}.glb`)));

  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const box = new THREE.Box3();
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  const objects = {} as Record<PropName, THREE.Group>;

  names.forEach((name, i) => {
    const model = scenes[i].scene;
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = shadows;
      mesh.receiveShadow = shadows;
      geometries.add(mesh.geometry);
      const m = mesh.material as THREE.MeshStandardMaterial;
      materials.add(m);
      if (m.metalnessMap) {
        m.metalness = metal;
        if (name === "brassPot") {
          // the scanned brass is dark and stands with its back to the window: a little diffuse response lets the
          // key light warm its front, and it picks up more of the room
          m.metalness = metal * 0.6;
          m.envMapIntensity = 1.6;
        }
      }
      for (const t of [m.map, m.normalMap, m.roughnessMap, m.metalnessMap, m.aoMap]) if (t) textures.add(t);
    });
    box.setFromObject(model);
    box.getSize(size);
    box.getCenter(center);
    const s = PROPS[name][1] / size.y;
    model.scale.setScalar(s);
    model.position.set(-center.x * s, -box.min.y * s, -center.z * s);
    const holder = new THREE.Group();
    holder.add(model);
    objects[name] = holder;
  });

  return {
    objects,
    textures: [...textures],
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}

/** The tray floor: a scanned walnut veneer (Poly Haven, CC0) colour map and roughness map, 1024 px WebP. */
export async function loadTrayWood(anisotropy: number) {
  const loader = new THREE.TextureLoader();
  const [map, rough] = await Promise.all(
    ["walnut_veneer_diff", "walnut_veneer_rough"].map((f) => loader.loadAsync(`${BASE}/models/${f}.webp`)),
  );
  map.colorSpace = THREE.SRGBColorSpace;
  for (const t of [map, rough]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = anisotropy;
  }
  return { map, rough };
}
