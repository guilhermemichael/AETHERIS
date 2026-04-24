import { describe, expect, it } from "vitest";

import { useSessionStore } from "../state/sessionStore";
import { useWorldStore } from "../state/worldStore";

describe("stores", () => {
  it("hydrates session state from init payload", () => {
    useSessionStore.getState().hydrateFromInit({
      session_id: "51d13dbf-8352-4c8b-a500-fcbf378ab6eb",
      access_token: "token",
      expires_at: "2026-04-24T18:00:00Z",
      consent: {
        microphone: false,
        camera: false,
        local_biometrics: false,
        audio: false,
        presence: false,
      },
      room_id: "room_void_01",
      world_state: {
        mode: "void",
        seed: "seed",
        entropy: 0.2,
        fog_density: 0.5,
        bloom_strength: 0.3,
        particle_density: 0.4,
        gravity: 0.4,
        color_temperature: 0.3,
        palette: ["#000000", "#050507", "#72F7FF", "#8A5CFF", "#5FFFC2"],
        typography_weight: 400,
        audio_intensity: 0.2,
      },
      feature_flags: {
        webgpu_enabled: true,
        webgl_fallback_enabled: true,
        local_biometrics_enabled: true,
        audio_reactive_enabled: true,
        websocket_enabled: true,
        echoes_enabled: false,
      },
    });

    expect(useSessionStore.getState().sessionId).toBe("51d13dbf-8352-4c8b-a500-fcbf378ab6eb");
    expect(useSessionStore.getState().featureFlags?.webgpu_enabled).toBe(true);
  });

  it("merges local input without overwriting existing values", () => {
    useWorldStore.getState().mergeLocalInput({ attention: 0.95, motionTension: 0.42 });

    expect(useWorldStore.getState().localInput.attention).toBe(0.95);
    expect(useWorldStore.getState().localInput.motionTension).toBe(0.42);
    expect(useWorldStore.getState().localInput.cameraEnergy).toBeDefined();
    expect(useWorldStore.getState().localInput.pointerX).toBeDefined();
  });
});

