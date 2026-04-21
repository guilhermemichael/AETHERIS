import { describe, expect, it } from "vitest";

import { mapLocalInputToWorldModifiers } from "../biometrics/localInput";
import { buildConsentPayload } from "../biometrics/privacy";

describe("biometrics helpers", () => {
  it("gates local biometrics behind microphone consent", () => {
    const payload = buildConsentPayload({
      sessionId: "sess_1",
      enableMic: false,
      enableBiometrics: true,
      enableAudio: true,
      enablePresence: true,
    });

    expect(payload.local_biometrics).toBe(false);
    expect(payload.mic).toBe(false);
  });

  it("maps local input into render modifiers", () => {
    const modifiers = mapLocalInputToWorldModifiers(
      {
        mode: "ritual",
        fog_density: 0.3,
        gravity: 0.4,
        bloom: 0.5,
        entropy: 0.6,
        particle_count: 1200,
        palette: ["#05070B", "#68F0DA", "#8E6CFF", "#72D4A4"],
        typography_weight: 400,
        soundscape: "silent_depth",
        reveal_radius: 0.2,
        collective_luminosity: 0.3,
      },
      {
        breathRate: 3.5,
        attention: 0.82,
        motionTension: 0.28,
        pointerX: 0.3,
        pointerY: 0.4,
        dwell: 0.44,
        lastInteractionAt: 0,
      },
    );

    expect(modifiers.bloomBoost).toBeGreaterThan(0);
    expect(modifiers.revealBoost).toBeGreaterThan(0.2);
    expect(modifiers.turbulence).toBeLessThanOrEqual(1);
  });
});

