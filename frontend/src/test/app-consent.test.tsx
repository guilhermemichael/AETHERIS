import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  initSessionMock,
  updateConsentMock,
  requestMediaPermissionsMock,
  startMicrophoneCaptureMock,
  startCameraCaptureMock,
  getMediaCapabilityMock,
  wsConnectMock,
  wsCloseMock,
} = vi.hoisted(() => ({
  initSessionMock: vi.fn(),
  updateConsentMock: vi.fn(),
  requestMediaPermissionsMock: vi.fn(),
  startMicrophoneCaptureMock: vi.fn(),
  startCameraCaptureMock: vi.fn(),
  getMediaCapabilityMock: vi.fn(),
  wsConnectMock: vi.fn(),
  wsCloseMock: vi.fn(),
}));

vi.mock("../api/sessions", () => ({
  initSession: initSessionMock,
  updateConsent: updateConsentMock,
}));

vi.mock("../app/RenderViewport", () => ({
  RenderViewport: () => <div data-testid="render-viewport" />,
}));

vi.mock("../biometrics/permissions", () => ({
  requestMediaPermissions: requestMediaPermissionsMock,
  getMediaCapability: getMediaCapabilityMock,
  buildConsentState: (
    preferences: Record<string, boolean>,
    permissions: {
      microphone: { granted: boolean };
      camera: { granted: boolean };
    },
  ) => ({
    microphone: preferences.microphone && permissions.microphone.granted,
    camera: preferences.camera && permissions.camera.granted,
    local_biometrics: preferences.localBiometrics && permissions.microphone.granted,
    audio: preferences.audio,
    presence: preferences.presence,
  }),
  summarizePermissionIssues: () => null,
}));

vi.mock("../biometrics/microphone", () => ({
  startMicrophoneCapture: startMicrophoneCaptureMock,
  explainMicrophoneError: (error: unknown) =>
    error instanceof Error ? error.message : "Unable to initialize microphone capture.",
}));

vi.mock("../biometrics/camera", () => ({
  startCameraCapture: startCameraCaptureMock,
}));

vi.mock("../sync/wsClient", () => ({
  AetherisWsClient: class {
    connect = wsConnectMock;
    close = wsCloseMock;
  },
}));

import { App } from "../app/App";
import { useSessionStore } from "../state/sessionStore";
import { defaultLocalInputSnapshot, useWorldStore } from "../state/worldStore";
import { useUiStore } from "../state/uiStore";

describe("App consent handshake", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    initSessionMock.mockResolvedValue({
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

    updateConsentMock.mockResolvedValue({
      session_id: "51d13dbf-8352-4c8b-a500-fcbf378ab6eb",
      consent: {
        microphone: true,
        camera: true,
        local_biometrics: false,
        audio: true,
        presence: true,
      },
      world_state: {
        mode: "crystal",
        seed: "seed",
        entropy: 0.25,
        fog_density: 0.45,
        bloom_strength: 0.35,
        particle_density: 0.45,
        gravity: 0.41,
        color_temperature: 0.4,
        palette: ["#000000", "#050507", "#72F7FF", "#8A5CFF", "#5FFFC2"],
        typography_weight: 500,
        audio_intensity: 0.36,
      },
    });

    requestMediaPermissionsMock.mockResolvedValue({
      microphone: {
        granted: true,
        stream: new MediaStream(),
        error: null,
      },
      camera: {
        granted: true,
        stream: new MediaStream(),
        error: null,
      },
    });

    startMicrophoneCaptureMock.mockResolvedValue({
      stop: vi.fn(),
    });

    startCameraCaptureMock.mockResolvedValue({
      stop: vi.fn(),
    });

    getMediaCapabilityMock.mockReturnValue({
      requestable: true,
      reason: null,
    });

    useSessionStore.setState({
      sessionId: null,
      accessToken: null,
      expiresAt: null,
      roomId: null,
      featureFlags: null,
      consent: {
        microphone: false,
        camera: false,
        local_biometrics: false,
        audio: false,
        presence: false,
      },
      websocketConnected: false,
    });
    useWorldStore.setState({
      worldState: null,
      localInput: { ...defaultLocalInputSnapshot },
      rendererMode: "static",
    });
    useUiStore.setState({
      phase: "void",
      activeNodeId: "about",
      brush: { x: 50, y: 50 },
      error: null,
    });
  });

  it("requests media permissions before initializing the backend session", async () => {
    render(<App />);
    await act(async () => {
      useUiStore.getState().setPhase("consent");
    });

    expect(await screen.findByText("Let the environment attune to your presence.")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Microphone-driven presence"));
    fireEvent.click(screen.getByLabelText("Camera-based local framing"));
    fireEvent.click(screen.getByRole("button", { name: "Begin calibration" }));

    await waitFor(() => expect(requestMediaPermissionsMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(initSessionMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(startMicrophoneCaptureMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(startCameraCaptureMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(updateConsentMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(wsConnectMock).toHaveBeenCalledTimes(1));

    expect(requestMediaPermissionsMock.mock.invocationCallOrder[0]).toBeLessThan(
      initSessionMock.mock.invocationCallOrder[0],
    );
    expect(initSessionMock.mock.invocationCallOrder[0]).toBeLessThan(
      updateConsentMock.mock.invocationCallOrder[0],
    );
    expect(updateConsentMock).toHaveBeenCalledWith(
      "token",
      expect.objectContaining({
        microphone: true,
        camera: true,
      }),
    );
  });
});
