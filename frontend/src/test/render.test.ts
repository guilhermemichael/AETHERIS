import { describe, expect, it } from "vitest";

import { resolveRendererMode } from "../render/capabilities";

describe("renderer selection", () => {
  it("prefers webgpu when available", () => {
    expect(resolveRendererMode({ webgpu: true, webgl2: true })).toBe("webgpu");
  });

  it("falls back to webgl2 when webgpu is unavailable", () => {
    expect(resolveRendererMode({ webgpu: false, webgl2: true })).toBe("webgl2");
  });

  it("falls back to static mode when gpu rendering is unavailable", () => {
    expect(resolveRendererMode({ webgpu: false, webgl2: false })).toBe("static");
  });
});

