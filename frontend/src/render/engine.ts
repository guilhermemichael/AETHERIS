import type { LocalInputSnapshot, WorldState } from "../app/types";
import { detectRendererCapabilities, resolveRendererMode, type RendererMode } from "./capabilities";
import { RitualSceneController } from "./scene";

export class AetherisRenderEngine {
  private controller: RitualSceneController | null = null;
  private rendererMode: RendererMode = "static";

  async mount(
    container: HTMLElement,
    worldState: WorldState,
    localInput: LocalInputSnapshot,
  ): Promise<RendererMode> {
    this.rendererMode = resolveRendererMode(detectRendererCapabilities(container.ownerDocument));
    this.controller = new RitualSceneController(container, this.rendererMode, worldState, localInput);
    await this.controller.mount();
    return this.rendererMode;
  }

  update(worldState: WorldState, localInput: LocalInputSnapshot) {
    this.controller?.update(worldState, localInput);
  }

  dispose() {
    this.controller?.dispose();
    this.controller = null;
  }

  getMode() {
    return this.rendererMode;
  }
}

