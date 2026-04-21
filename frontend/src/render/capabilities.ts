export type RendererMode = "webgpu" | "webgl2" | "static";

export interface RendererCapabilities {
  webgpu: boolean;
  webgl2: boolean;
}

export function detectRendererCapabilities(doc: Document = document): RendererCapabilities {
  const webgpu = typeof navigator !== "undefined" && "gpu" in navigator;
  const canvas = doc.createElement("canvas");
  const webgl2 = Boolean(canvas.getContext("webgl2"));
  return {
    webgpu,
    webgl2,
  };
}

export function resolveRendererMode(capabilities: RendererCapabilities): RendererMode {
  if (capabilities.webgpu) {
    return "webgpu";
  }
  if (capabilities.webgl2) {
    return "webgl2";
  }
  return "static";
}

