import * as THREE from "three";

import type { WorldState } from "../api/contracts";

export class ParticleSystem {
  readonly mesh: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private count: number;

  constructor(worldState: WorldState) {
    this.count = resolveParticleCount(worldState);
    const geometry = buildGeometry(this.count);
    const material = new THREE.PointsMaterial({
      color: new THREE.Color(worldState.palette[3] ?? "#8a5cff"),
      size: 0.02,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    this.mesh = new THREE.Points(geometry, material);
  }

  update(worldState: WorldState, dt: number, turbulence: number) {
    const nextCount = resolveParticleCount(worldState);
    if (Math.abs(nextCount - this.count) > 160) {
      this.count = nextCount;
      this.mesh.geometry.dispose();
      this.mesh.geometry = buildGeometry(this.count);
    }
    this.mesh.rotation.y += dt * (0.08 + turbulence * 0.45);
    this.mesh.rotation.x = Math.sin(performance.now() * 0.00018) * 0.08;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

function resolveParticleCount(worldState: WorldState) {
  return Math.round(720 + worldState.particle_density * 2400);
}

function buildGeometry(particleCount: number) {
  const positions = new Float32Array(particleCount * 3);

  for (let index = 0; index < particleCount; index += 1) {
    const radius = 2.2 + Math.random() * 3.2;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[index * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[index * 3 + 2] = radius * Math.cos(phi);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return geometry;
}
