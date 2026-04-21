import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  initSessionMock,
  updateConsentMock,
  startMicrophoneCaptureMock,
  getMicrophoneCapabilityMock,
} = vi.hoisted(() => ({
  initSessionMock: vi.fn(),
  updateConsentMock: vi.fn(),
  startMicrophoneCaptureMock: vi.fn(),
  getMicrophoneCapabilityMock: vi.fn(),
}));

vi.mock("../app/api", () => ({
  initSession: initSessionMock,
  updateConsent: updateConsentMock,
}));

vi.mock("../app/RenderViewport", () => ({
  RenderViewport: () => <div data-testid="render-viewport" />,
}));

vi.mock("../render/audio", () => ({
  ReactiveSoundscape: class {
    async start() {}
    update() {}
    stop() {}
  },
}));

vi.mock("../biometrics/microphone", () => ({
  startMicrophoneCapture: startMicrophoneCaptureMock,
  explainMicrophoneError: (error: unknown) =>
    error instanceof Error ? error.message : "Unable to initialize microphone capture.",
  getMicrophoneCapability: getMicrophoneCapabilityMock,
}));

import { App } from "../app/App";
import { useSessionStore } from "../state/sessionStore";
import { defaultLocalInputSnapshot, useWorldStore } from "../state/worldStore";
import { useUiStore } from "../state/uiStore";

describe("App consent handshake", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    initSessionMock.mockResolvedValue({
      session_id: "sess_test",
      access_token: "token",
      seed: "seed",
      room_id: "room_void_01",
      consent_required: ["audio_reactive", "mic"],
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

    updateConsentMock.mockResolvedValue({
      session_id: "sess_test",
      consent: {
        mic: true,
        camera: false,
        local_biometrics: false,
        presence_sync: true,
        audio_reactive: true,
      },
      consent_required: ["audio_reactive", "mic"],
      world_state: {
        mode: "ritual",
        fog_density: 0.45,
        gravity: 0.41,
        bloom: 0.35,
        entropy: 0.25,
        particle_count: 1100,
        palette: ["#05070B", "#68F0DA", "#8E6CFF", "#72D4A4"],
        typography_weight: 500,
        soundscape: "resonant_veil",
        reveal_radius: 0.25,
        collective_luminosity: 0.36,
      },
      feature_flags: {
        webgpu_preferred: true,
        reactive_audio: true,
        brush_reveal: true,
        social_presence: false,
        temporal_echoes: false,
      },
    });

    startMicrophoneCaptureMock.mockResolvedValue({
      stop: vi.fn(),
    });

    getMicrophoneCapabilityMock.mockReturnValue({
      requestable: true,
      reason: null,
    });

    useSessionStore.setState({
      sessionId: null,
      accessToken: null,
      seed: null,
      roomId: null,
      featureFlags: null,
      consentRequired: [],
      consent: {
        mic: false,
        camera: false,
        local_biometrics: false,
        presence_sync: true,
        audio_reactive: true,
      },
    });
    useWorldStore.setState({
      worldState: null,
      localInput: { ...defaultLocalInputSnapshot },
    });
    useUiStore.setState({
      phase: "void",
      activeNodeId: "about",
      brush: { x: 50, y: 50 },
    });
  });

  it("requests microphone access from the consent button gesture before syncing consent", async () => {
    render(<App />);

    await waitFor(() => expect(initSessionMock).toHaveBeenCalledTimes(1));
    await act(async () => {
      useUiStore.getState().setPhase("consent");
    });

    expect(await screen.findByText("Let the environment adapt to your presence.")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Microphone-driven presence"));
    fireEvent.click(screen.getByRole("button", { name: "Enter the biosphere" }));

    await waitFor(() => expect(startMicrophoneCaptureMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(updateConsentMock).toHaveBeenCalledTimes(1));

    expect(startMicrophoneCaptureMock.mock.invocationCallOrder[0]).toBeLessThan(
      updateConsentMock.mock.invocationCallOrder[0],
    );
    expect(updateConsentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        session_id: "sess_test",
        mic: true,
      }),
    );
  });
});
