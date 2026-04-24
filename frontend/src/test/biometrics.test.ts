import { describe, expect, it } from "vitest";

import { mapLocalInputToWorldModifiers } from "../biometrics/localInput";
import { buildConsentState } from "../biometrics/permissions";

describe("biometrics helpers", () => {
  it("gates local biometrics behind microphone consent", () => {
    const payload = buildConsentState(
      {
        microphone: false,
        camera: false,
        localBiometrics: true,
        audio: true,
        presence: true,
      },
      {
        microphone: { granted: false, stream: null, error: null },
        camera: { granted: false, stream: null, error: null },
      },
    );

    expect(payload.local_biometrics).toBe(false);
    expect(payload.microphone).toBe(false);
  });

  it("maps local input into render modifiers", () => {
    const modifiers = mapLocalInputToWorldModifiers(
      {
        mode: "nebula",
        seed: "seed",
        entropy: 0.6,
        fog_density: 0.3,
        bloom_strength: 0.5,
        particle_density: 0.45,
        gravity: 0.4,
        color_temperature: 0.4,
        palette: ["#000000", "#050507", "#72F7FF", "#8A5CFF", "#5FFFC2"],
        typography_weight: 400,
        audio_intensity: 0.3,
      },
      {
        breathRate: 3.5,
        cameraEnergy: 0.4,
        attention: 0.82,
        motionTension: 0.28,
        pointerX: 0.3,
        pointerY: 0.4,
        dwell: 0.44,
        lastInteractionAt: 0,
      },
    );

    expect(modifiers.bloomBoost).toBeGreaterThan(0);
    expect(modifiers.revealBoost).toBeGreaterThan(0.1);
    expect(modifiers.turbulence).toBeLessThanOrEqual(1);
  });
});

