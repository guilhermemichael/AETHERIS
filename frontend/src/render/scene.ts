import * as THREE from "three";

import type { LocalInputSnapshot, WorldState } from "../app/types";
import type { RendererMode } from "./capabilities";
import { mapLocalInputToWorldModifiers } from "../biometrics/localInput";

type RuntimeRenderer = {
  domElement: HTMLCanvasElement;
  setPixelRatio: (value: number) => void;
  setSize: (width: number, height: number) => void;
  render: (scene: THREE.Scene, camera: THREE.PerspectiveCamera) => void;
  dispose: () => void;
};

export class RitualSceneController {
  private renderer: RuntimeRenderer | null = null;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
  private pulse: THREE.Mesh<THREE.IcosahedronGeometry, THREE.MeshBasicMaterial>;
  private cloud: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private resizeObserver: ResizeObserver | null = null;
  private frameId = 0;
  private worldState: WorldState;
  private localInput: LocalInputSnapshot;
  private staticFallback: HTMLDivElement | null = null;

  constructor(
    private readonly container: HTMLElement,
    private readonly mode: RendererMode,
    worldState: WorldState,
    localInput: LocalInputSnapshot,
  ) {
    this.worldState = worldState;
    this.localInput = localInput;
    this.camera.position.z = 7;
    this.scene.fog = new THREE.FogExp2(0x05070b, 0.06);
    this.pulse = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.72, 4),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(worldState.palette[1]) }),
    );
    this.cloud = this.buildParticleCloud(worldState);
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    this.scene.add(this.pulse);
    this.scene.add(this.cloud);
  }

  async mount(): Promise<void> {
    if (this.mode === "static") {
      const fallback = document.createElement("div");
      fallback.className = "static-ritual";
      this.container.appendChild(fallback);
      this.staticFallback = fallback;
      return;
    }

    this.renderer = await this.createRenderer(this.mode);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    this.container.appendChild(this.renderer.domElement);
    this.handleResize();
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);
    this.animate();
  }

  update(worldState: WorldState, localInput: LocalInputSnapshot) {
    this.worldState = worldState;
    this.localInput = localInput;
    this.container.style.setProperty("--accent-color", worldState.palette[1]);

    if (this.staticFallback) {
      this.staticFallback.style.background = `radial-gradient(circle at 50% 50%, ${worldState.palette[1]}22 0%, transparent 60%)`;
      return;
    }

    this.pulse.material.color.set(worldState.palette[1]);
    this.cloud.material.color.set(worldState.palette[2]);
    this.cloud.material.size = 0.012 + worldState.bloom * 0.02;
  }

  dispose() {
    window.cancelAnimationFrame(this.frameId);
    this.resizeObserver?.disconnect();
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
    this.staticFallback?.remove();
  }

  private animate = () => {
    if (!this.renderer) {
      return;
    }

    const modifiers = mapLocalInputToWorldModifiers(this.worldState, this.localInput);
    const time = performance.now() * 0.001;

    this.pulse.rotation.x = time * 0.16 + modifiers.turbulence * 0.4;
    this.pulse.rotation.y = time * 0.22;
    this.pulse.scale.setScalar(0.94 + modifiers.bloomBoost * 0.12 + Math.sin(time * 1.4) * 0.08);

    this.cloud.rotation.y += 0.0008 + modifiers.turbulence * 0.003;
    this.cloud.rotation.x = Math.sin(time * 0.24) * 0.08;
    (this.scene.fog as THREE.FogExp2).density = 0.04 + this.worldState.fog_density * 0.08;

    this.renderer.render(this.scene, this.camera);
    this.frameId = window.requestAnimationFrame(this.animate);
  };

  private handleResize() {
    if (!this.renderer) {
      return;
    }
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private buildParticleCloud(worldState: WorldState) {
    const particleCount = Math.min(2400, Math.max(600, worldState.particle_count));
    const positions = new Float32Array(particleCount * 3);

    for (let index = 0; index < particleCount; index += 1) {
      const radius = 2 + Math.random() * 2.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[index * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[index * 3 + 2] = radius * Math.cos(phi);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: new THREE.Color(worldState.palette[2]),
      size: 0.02,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });

    return new THREE.Points(geometry, material);
  }

  private async createRenderer(mode: RendererMode): Promise<RuntimeRenderer> {
    if (mode === "webgpu") {
      try {
        const module = (await import("three/webgpu")) as {
          WebGPURenderer?: new (options?: Record<string, unknown>) => RuntimeRenderer;
        };
        if (module.WebGPURenderer) {
          return new module.WebGPURenderer({ antialias: true, alpha: true });
        }
      } catch {
        return new THREE.WebGLRenderer({ antialias: true, alpha: true });
      }
    }

    return new THREE.WebGLRenderer({ antialias: true, alpha: true });
  }
}

