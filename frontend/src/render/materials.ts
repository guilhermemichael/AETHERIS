import * as THREE from "three";

import type { WorldState } from "../api/contracts";

export function createPulseMaterial(worldState: WorldState) {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(worldState.palette[2] ?? "#72f7ff"),
    transparent: true,
    opacity: 0.95,
  });
}

export function syncPalette(
  pulseMaterial: THREE.MeshBasicMaterial,
  particleMaterial: THREE.PointsMaterial,
  worldState: WorldState,
) {
  pulseMaterial.color.set(worldState.palette[2] ?? "#72f7ff");
  particleMaterial.color.set(worldState.palette[3] ?? "#8a5cff");
  particleMaterial.size = 0.012 + worldState.particle_density * 0.025;
  particleMaterial.opacity = 0.35 + worldState.bloom_strength * 0.4;
}
