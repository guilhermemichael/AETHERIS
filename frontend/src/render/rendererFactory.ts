import * as THREE from "three";

import type { RendererMode } from "./capabilities";

export interface RuntimeRenderer {
  domElement: HTMLCanvasElement;
  setPixelRatio: (value: number) => void;
  setSize: (width: number, height: number) => void;
  render: (scene: THREE.Scene, camera: THREE.PerspectiveCamera) => void;
  dispose: () => void;
}

export async function createRenderer(mode: RendererMode): Promise<RuntimeRenderer | null> {
  if (mode === "static") {
    return null;
  }

  if (mode === "webgpu") {
    try {
      const module = (await import("three/webgpu")) as {
        WebGPURenderer?: new (options?: Record<string, unknown>) => RuntimeRenderer;
      };
      if (module.WebGPURenderer) {
        return new module.WebGPURenderer({ antialias: true, alpha: true });
      }
    } catch {
      try {
        return new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        return null;
      }
    }
  }

  try {
    return new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    return null;
  }
}
