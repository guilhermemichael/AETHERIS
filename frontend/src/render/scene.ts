import * as THREE from "three";

import type { WorldState } from "../api/contracts";
import { mapLocalInputToWorldModifiers, type LocalInputSnapshot } from "../biometrics/localInput";
import type { RendererMode } from "./capabilities";
import { BrushRevealController } from "./brushReveal";
import { createPulseMaterial, syncPalette } from "./materials";
import { ParticleSystem } from "./particles";
import { SceneComposer } from "./postprocessing";
import { createRenderer, type RuntimeRenderer } from "./rendererFactory";
import { TypographyController } from "./typography";

export interface ViewportState {
  width: number;
  height: number;
  dpr: number;
}

export class ImmersiveSceneController {
  private renderer: RuntimeRenderer | null = null;
  private composer: SceneComposer | null = null;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
  private readonly pulse: THREE.Mesh<THREE.IcosahedronGeometry, THREE.MeshBasicMaterial>;
  private readonly particleSystem: ParticleSystem;
  private readonly brushReveal: BrushRevealController;
  private readonly typography: TypographyController;
  private staticFallback: HTMLDivElement | null = null;
  private worldState: WorldState;

  constructor(
    private readonly container: HTMLElement,
    private readonly mode: RendererMode,
    worldState: WorldState,
  ) {
    this.worldState = worldState;
    this.camera.position.z = 7;
    this.scene.fog = new THREE.FogExp2(0x050507, 0.06);
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    this.pulse = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.72, 4),
      createPulseMaterial(worldState),
    );
    this.particleSystem = new ParticleSystem(worldState);
    this.brushReveal = new BrushRevealController(container);
    this.typography = new TypographyController(container);
    this.scene.add(this.pulse);
    this.scene.add(this.particleSystem.mesh);
  }

  async mount(viewport: ViewportState) {
    if (this.mode === "static") {
      const fallback = document.createElement("div");
      fallback.className = "static-ritual";
      this.container.appendChild(fallback);
      this.staticFallback = fallback;
      return;
    }

    this.renderer = await createRenderer(this.mode);
    if (!this.renderer) {
      return;
    }
    this.composer = new SceneComposer(this.renderer);
    this.renderer.setPixelRatio(Math.min(viewport.dpr, 1.8));
    this.renderer.domElement.className = "aetheris-canvas";
    this.container.appendChild(this.renderer.domElement);
    this.resize(viewport);
  }

  update(dt: number, worldState: WorldState, input: LocalInputSnapshot, viewport: ViewportState) {
    this.worldState = worldState;
    this.brushReveal.update(input);
    this.typography.update(worldState.typography_weight);

    if (this.staticFallback) {
      this.staticFallback.style.background = `radial-gradient(circle at 50% 50%, ${worldState.palette[2]}22 0%, transparent 60%)`;
      return;
    }

    if (!this.renderer || !this.composer) {
      return;
    }

    const modifiers = mapLocalInputToWorldModifiers(worldState, input);
    this.resize(viewport);
    syncPalette(this.pulse.material, this.particleSystem.mesh.material, worldState);
    this.particleSystem.update(worldState, dt, modifiers.turbulence);
    this.pulse.rotation.x += dt * (0.28 + modifiers.turbulence * 0.45);
    this.pulse.rotation.y += dt * 0.42;
    this.pulse.scale.setScalar(
      0.92 + modifiers.bloomBoost * 0.1 + Math.sin(performance.now() * 0.0014) * 0.06,
    );
    (this.scene.fog as THREE.FogExp2).density = 0.03 + worldState.fog_density * 0.09;
    this.composer.render(this.scene, this.camera);
  }

  resize(viewport: ViewportState) {
    if (!this.renderer) {
      return;
    }

    const width = Math.max(1, viewport.width);
    const height = Math.max(1, viewport.height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  dispose() {
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
    this.staticFallback?.remove();
    this.particleSystem.dispose();
    this.pulse.geometry.dispose();
    this.pulse.material.dispose();
  }
}
