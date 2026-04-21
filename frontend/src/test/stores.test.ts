import { describe, expect, it } from "vitest";

import { useSessionStore } from "../state/sessionStore";
import { useWorldStore } from "../state/worldStore";

describe("stores", () => {
  it("hydrates session state from init payload", () => {
    useSessionStore.getState().hydrateFromInit({
      session_id: "sess_abc",
      access_token: "token",
      seed: "seed",
      room_id: "room_void_01",
      consent_required: ["audio_reactive"],
      world_state: {
        mode: "ritual",
        fog_density: 0.5,
        gravity: 0.4,
        bloom: 0.3,
        entropy: 0.2,
        particle_count: 1000,
        palette: ["#05070B", "#68F0DA", "#8E6CFF", "#72D4A4"],
        typography_weight: 400,
        soundscape: "silent_depth",
        reveal_radius: 0.2,
        collective_luminosity: 0.3,
      },
      feature_flags: {
        webgpu_preferred: true,
        reactive_audio: true,
        brush_reveal: true,
        social_presence: false,
        temporal_echoes: false,
      },
    });

    expect(useSessionStore.getState().sessionId).toBe("sess_abc");
    expect(useSessionStore.getState().featureFlags?.webgpu_preferred).toBe(true);
  });

  it("merges local input without overwriting existing values", () => {
    useWorldStore.getState().mergeLocalInput({ attention: 0.95, motionTension: 0.42 });

    expect(useWorldStore.getState().localInput.attention).toBe(0.95);
    expect(useWorldStore.getState().localInput.motionTension).toBe(0.42);
    expect(useWorldStore.getState().localInput.pointerX).toBeDefined();
  });
});

