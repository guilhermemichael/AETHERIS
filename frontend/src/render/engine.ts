import type { WorldState } from "../api/contracts";
import type { LocalInputSnapshot } from "../biometrics/localInput";
import { ReactiveSoundscape } from "./audio";
import { detectRendererCapabilities, resolveRendererMode, type RendererMode } from "./capabilities";
import { ImmersiveSceneController, type ViewportState } from "./scene";

export interface RenderInput {
  worldState: WorldState;
  localInput: LocalInputSnapshot;
  viewport: ViewportState;
}

export class AetherisRenderEngine {
  private controller: ImmersiveSceneController | null = null;
  private input: RenderInput | null = null;
  private frameId = 0;
  private lastTime = 0;
  private rendererMode: RendererMode = "static";
  private soundscape = new ReactiveSoundscape();

  async mount(container: HTMLElement, input: RenderInput): Promise<RendererMode> {
    this.rendererMode = resolveRendererMode(detectRendererCapabilities(container.ownerDocument));
    this.input = input;
    this.controller = new ImmersiveSceneController(container, this.rendererMode, input.worldState);
    await this.controller.mount(input.viewport);
    this.lastTime = performance.now();
    if (input.worldState.audio_intensity > 0.12) {
      await this.soundscape.start();
    }
    this.frameId = window.requestAnimationFrame(this.frame);
    return this.rendererMode;
  }

  update(input: RenderInput) {
    this.input = input;
  }

  dispose() {
    window.cancelAnimationFrame(this.frameId);
    this.soundscape.stop();
    this.controller?.dispose();
    this.controller = null;
  }

  private frame = (now: number) => {
    if (!this.controller || !this.input) {
      return;
    }

    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.controller.update(dt, this.input.worldState, this.input.localInput, this.input.viewport);
    this.soundscape.update(this.input.worldState, this.input.localInput);
    this.lastTime = now;
    this.frameId = window.requestAnimationFrame(this.frame);
  };
}
