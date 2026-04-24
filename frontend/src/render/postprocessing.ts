import type * as THREE from "three";

import type { RuntimeRenderer } from "./rendererFactory";

export class SceneComposer {
  constructor(private readonly renderer: RuntimeRenderer) {}

  render(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.renderer.render(scene, camera);
  }
}
