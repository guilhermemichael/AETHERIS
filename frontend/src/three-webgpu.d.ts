declare module "three/webgpu" {
  export class WebGPURenderer {
    constructor(options?: Record<string, unknown>);
    domElement: HTMLCanvasElement;
    setPixelRatio(value: number): void;
    setSize(width: number, height: number): void;
    render(scene: unknown, camera: unknown): void;
    dispose(): void;
  }
}
