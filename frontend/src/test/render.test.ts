import { describe, expect, it } from "vitest";

import { resolveRendererMode } from "../render/capabilities";

describe("renderer selection", () => {
  it("prefers webgpu when available", () => {
    expect(resolveRendererMode({ webgpu: true, webgl: true })).toBe("webgpu");
  });

  it("falls back to webgl when webgpu is unavailable", () => {
    expect(resolveRendererMode({ webgpu: false, webgl: true })).toBe("webgl");
  });

  it("falls back to static mode when gpu rendering is unavailable", () => {
    expect(resolveRendererMode({ webgpu: false, webgl: false })).toBe("static");
  });
});

