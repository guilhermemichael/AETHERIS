export type RendererMode = "webgpu" | "webgl" | "static";

export interface RendererCapabilities {
  webgpu: boolean;
  webgl: boolean;
}

export function detectRendererCapabilities(doc: Document = document): RendererCapabilities {
  const webgpu = typeof navigator !== "undefined" && "gpu" in navigator;
  const canvas = doc.createElement("canvas");
  const webgl = Boolean(canvas.getContext("webgl2"));
  return {
    webgpu,
    webgl,
  };
}

export function resolveRendererMode(capabilities: RendererCapabilities): RendererMode {
  if (capabilities.webgpu) {
    return "webgpu";
  }
  if (capabilities.webgl) {
    return "webgl";
  }
  return "static";
}

