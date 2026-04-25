import {
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import { initSession, updateConsent } from "../api/sessions";
import type { ConsentState, SessionInitRequest, WorldState } from "../api/contracts";
import { ConsentGate } from "./ConsentGate";
import { siteManifest } from "../content/siteManifest";
import { startCameraCapture } from "../biometrics/camera";
import { stopControllers } from "../biometrics/cleanup";
import {
  buildConsentState,
  getMediaCapability,
  requestMediaPermissions,
  summarizePermissionIssues,
  type ConsentPreferences,
} from "../biometrics/permissions";
import {
  createPointerSnapshot,
  decayLocalInput,
} from "../biometrics/localInput";
import { explainMicrophoneError, startMicrophoneCapture } from "../biometrics/microphone";
import type { PermissionState } from "../state/inputStore";
import { useInputStore } from "../state/inputStore";
import { useSessionStore } from "../state/sessionStore";
import { defaultLocalInputSnapshot, useWorldStore } from "../state/worldStore";
import { useUiStore } from "../state/uiStore";
import { detectRendererCapabilities, resolveRendererMode } from "../render/capabilities";
import { AetherisWsClient } from "../sync/wsClient";

const initialConsentPreferences: ConsentPreferences = {
  microphone: false,
  camera: false,
  localBiometrics: false,
  audio: true,
  presence: true,
};

const RenderViewport = lazy(async () => {
  const module = await import("./RenderViewport");
  return { default: module.RenderViewport };
});

export function App() {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const microphoneRef = useRef<{ stop: () => void } | null>(null);
  const cameraRef = useRef<{ stop: () => void } | null>(null);
  const wsRef = useRef<AetherisWsClient | null>(null);
  const pulseTimerRef = useRef<number | null>(null);
  const consentTimerRef = useRef<number | null>(null);
  const [preferences, setPreferences] = useState(initialConsentPreferences);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const {
    consent,
    hydrateFromInit,
    applyConsent,
    setLocalConsent,
    setWebsocketConnected,
    clearSession,
  } =
    useSessionStore();
  const { worldState, localInput, mergeLocalInput, setWorldState, setRendererMode } =
    useWorldStore();
  const { phase, activeNodeId, brush, error, setActiveNodeId, setBrush, setError, setPhase } =
    useUiStore();
  const { setCameraState, setMicrophoneState } = useInputStore();

  const microphoneCapability = useMemo(() => getMediaCapability("microphone"), []);
  const cameraCapability = useMemo(() => getMediaCapability("camera"), []);
  const activeNode = useMemo(
    () => siteManifest.find((entry) => entry.id === activeNodeId) ?? siteManifest[0],
    [activeNodeId],
  );
  const shouldRenderViewport = phase === "world" && worldState !== null;

  useEffect(() => {
    setPhase("void");
    pulseTimerRef.current = window.setTimeout(() => {
      if (useUiStore.getState().phase === "void") {
        setPhase("pulse");
      }
    }, 280);
    consentTimerRef.current = window.setTimeout(() => {
      const currentPhase = useUiStore.getState().phase;
      if (currentPhase === "void" || currentPhase === "pulse") {
        setPhase("consent");
      }
    }, 1120);

    return () => {
      if (pulseTimerRef.current !== null) {
        window.clearTimeout(pulseTimerRef.current);
      }
      if (consentTimerRef.current !== null) {
        window.clearTimeout(consentTimerRef.current);
      }
    };
  }, [setPhase]);

  useEffect(() => {
    if (phase !== "world") {
      return;
    }

    const decayId = window.setInterval(() => {
      mergeLocalInput(decayLocalInput(useWorldStore.getState().localInput));
    }, 160);

    return () => window.clearInterval(decayId);
  }, [mergeLocalInput, phase]);

  useEffect(() => {
    if (!shellRef.current) {
      return;
    }

    const node = shellRef.current;
    const handlePointerMove = (event: PointerEvent) => {
      const bounds = node.getBoundingClientRect();
      const next = createPointerSnapshot(event, bounds, useWorldStore.getState().localInput);
      mergeLocalInput(next);
      setBrush({
        x: next.pointerX * 100,
        y: next.pointerY * 100,
      });
    };

    const handleVisibility = () => {
      mergeLocalInput({
        attention: document.visibilityState === "visible" ? 0.92 : 0.4,
      });
    };

    node.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      node.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [mergeLocalInput, setBrush]);

  useEffect(() => {
    return () => {
      stopControllers(microphoneRef.current, cameraRef.current);
      wsRef.current?.close();
      clearSession();
    };
  }, [clearSession]);

  const handleConsentSubmit = async () => {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setNotice(null);
    setPhase("authenticating");
    wsRef.current?.close();
    setWebsocketConnected(false);
    stopControllers(microphoneRef.current, cameraRef.current);
    microphoneRef.current = null;
    cameraRef.current = null;

    try {
      console.info("[AETHERIS] consent accepted", preferences);
      const permissionResult = await requestMediaPermissions(preferences);
      console.info("[AETHERIS] media result", permissionResult);
      setMicrophoneState(
        resolvePermissionState(
          preferences.microphone,
          microphoneCapability.requestable,
          permissionResult.microphone.granted,
        ),
      );
      setCameraState(
        resolvePermissionState(
          preferences.camera,
          cameraCapability.requestable,
          permissionResult.camera.granted,
        ),
      );

      console.info("[AETHERIS] session init start");
      const initResponse = await initSession(buildInitialRequest());
      console.info("[AETHERIS] session init done", initResponse);
      hydrateFromInit(initResponse);
      setWorldState(initResponse.world_state);

      const consentState = buildConsentState(preferences, permissionResult);
      let nextWorldState = initResponse.world_state;
      console.info("[AETHERIS] world state", initResponse.world_state);

      try {
        console.info("[AETHERIS] consent sync start", consentState);
        const consentResponse = await updateConsent(initResponse.access_token, consentState);
        applyConsent(consentResponse);
        nextWorldState = consentResponse.world_state;
        setWorldState(consentResponse.world_state);
      } catch (caughtError) {
        console.warn("[AETHERIS] consent sync failed, continuing locally", caughtError);
        setLocalConsent(consentState);
        setNotice((current) =>
          joinMessages(current, "Consent sync is unavailable. Continuing with local-only state."),
        );
      }

      console.info("[AETHERIS] world state resolved", nextWorldState);
      mergeLocalInput({
        ...defaultLocalInputSnapshot,
        breathRate: useWorldStore.getState().localInput.breathRate,
        cameraEnergy: useWorldStore.getState().localInput.cameraEnergy,
      });

      const permissionNotice = summarizePermissionIssues(permissionResult);
      if (permissionNotice) {
        setNotice(permissionNotice);
      }
      console.info("[AETHERIS] switching phase to world");
      setPhase("world");
      console.info("[AETHERIS] mounting renderer", Boolean(nextWorldState));

      void startRealtimeLayer(initResponse.access_token, initResponse.room_id);
      void startLocalControllers(permissionResult);
    } catch (caughtError) {
      console.error("[AETHERIS] bootstrap failed", caughtError);
      wsRef.current?.close();
      setWebsocketConnected(false);
      clearSession();
      setWorldState(createRitualSafeWorldState());
      mergeLocalInput({ ...defaultLocalInputSnapshot });
      setNotice("Session services are unavailable. Continuing in ritual-safe mode.");
      setError(describeBootstrapError(caughtError));
      setPhase("world");
    } finally {
      setSubmitting(false);
    }
  };

  const startLocalControllers = async (
    permissionResult: Awaited<ReturnType<typeof requestMediaPermissions>>,
  ) => {
    if (permissionResult.microphone.stream) {
      try {
        const controller = await startMicrophoneCapture(permissionResult.microphone.stream, (value) => {
          mergeLocalInput({ breathRate: value });
        });
        microphoneRef.current?.stop();
        microphoneRef.current = controller;
      } catch (caughtError) {
        console.warn("[AETHERIS] microphone bootstrap failed", caughtError);
        setNotice((current) => joinMessages(current, explainMicrophoneError(caughtError)));
      }
    }

    if (permissionResult.camera.stream) {
      try {
        const controller = await startCameraCapture(permissionResult.camera.stream, (value) => {
          mergeLocalInput({ cameraEnergy: value, attention: Math.min(1, 0.62 + value * 0.3) });
        });
        cameraRef.current?.stop();
        cameraRef.current = controller;
      } catch (caughtError) {
        console.warn("[AETHERIS] camera bootstrap failed", caughtError);
        setNotice((current) =>
          joinMessages(current, "Camera input is unavailable. Continuing without local framing."),
        );
      }
    }
  };

  const startRealtimeLayer = async (token: string, roomId: string) => {
    try {
      const wsClient = new AetherisWsClient(token, {
        onOpen: () => setWebsocketConnected(true),
        onClose: () => setWebsocketConnected(false),
        onMessage: (message) => {
          if (message.type === "presence.snapshot") {
            const sessions = Array.isArray(message.payload.sessions)
              ? message.payload.sessions.length
              : 0;
            mergeLocalInput({
              attention: Math.min(1, 0.68 + sessions * 0.08),
            });
          }
        },
      });
      wsRef.current = wsClient;
      wsClient.connect({ roomId });
    } catch (caughtError) {
      console.warn("[AETHERIS] realtime bootstrap failed", caughtError);
      setWebsocketConnected(false);
      setNotice((current) =>
        joinMessages(current, "Presence sync is unavailable. Continuing in local mode."),
      );
    }
  };

  return (
    <main
      ref={shellRef}
      className="aetheris-root"
      data-phase={phase}
      style={
        {
          "--brush-x": `${brush.x}%`,
          "--brush-y": `${brush.y}%`,
          "--accent-color": worldState?.palette[2] ?? "#72f7ff",
          "--accent-secondary": worldState?.palette[3] ?? "#8a5cff",
          "--accent-tertiary": worldState?.palette[4] ?? "#5fffc2",
          "--type-weight": `${worldState?.typography_weight ?? 320}`,
        } as CSSProperties
      }
    >
      {shouldRenderViewport ? (
        <Suspense fallback={<div className="aetheris-viewport aetheris-viewport--pending" />}>
          <RenderViewport
            worldState={worldState}
            localInput={localInput}
            onRendererMode={setRendererMode}
          />
        </Suspense>
      ) : (
        <div className="aetheris-viewport aetheris-viewport--pending" />
      )}
      <div className="fog-layer" />
      <div className="brush-layer" />
      <div className="grain-layer" />

      <section className="hero-copy" aria-live="polite">
        <p className="eyebrow">AETHERIS</p>
        <h1>Immersive core, production spine, no decorative chaos.</h1>
        <p className="lede">
          Presence enters first. Session state, renderer state, and content stay decoupled so the
          environment feels rare instead of fragile.
        </p>
      </section>

      <div className="pulse-node" aria-hidden="true" />

      {phase === "consent" || phase === "authenticating" ? (
        <ConsentGate
          preferences={preferences}
          microphoneCapability={microphoneCapability}
          cameraCapability={cameraCapability}
          notice={error ?? notice}
          submitting={submitting}
          onChange={(patch) => setPreferences((current) => ({ ...current, ...patch }))}
          onSubmit={() => void handleConsentSubmit()}
        />
      ) : null}

      {phase === "world" ? (
        <>
          {error ? (
            <section className="error-card" role="status">
              <p className="eyebrow">Ritual-safe mode</p>
              <h2>Session services lost cohesion.</h2>
              <p>{error}</p>
            </section>
          ) : null}

          <section className="content-constellation" aria-label="AETHERIS content nodes">
            {siteManifest.map((node) => (
              <button
                key={node.id}
                className={`content-node ${activeNode.id === node.id ? "is-active" : ""}`}
                style={{ top: node.anchor.top, left: node.anchor.left }}
                onMouseEnter={() => setActiveNodeId(node.id)}
                onFocus={() => setActiveNodeId(node.id)}
              >
                <span>{node.label}</span>
              </button>
            ))}
          </section>

          <aside className="detail-panel">
            <p className="eyebrow">{activeNode.eyebrow}</p>
            <h2>{activeNode.title}</h2>
            <p>{activeNode.body}</p>
            <p className="accent-copy">{activeNode.accent}</p>
          </aside>
        </>
      ) : null}

      <footer className="status-bar">
        <span>{worldState ? worldState.mode : phase === "authenticating" ? "attuning" : "void"}</span>
        <span>{describeConsent(consent)}</span>
      </footer>
    </main>
  );
}

function describeConsent(consent: ConsentState) {
  if (consent.local_biometrics && consent.microphone) {
    return "Somatic input active";
  }
  if (consent.camera && consent.microphone) {
    return "Camera and microphone local-only";
  }
  if (consent.microphone) {
    return "Microphone local-only";
  }
  if (consent.camera) {
    return "Camera local-only";
  }
  return "Interaction-only mode";
}

function resolvePermissionState(
  preferred: boolean,
  requestable: boolean,
  granted: boolean,
): PermissionState {
  if (!preferred) {
    return "idle";
  }
  if (!requestable) {
    return "unsupported";
  }
  return granted ? "granted" : "denied";
}

function joinMessages(...messages: Array<string | null | undefined>): string | null {
  const collected = messages
    .map((message) => message?.trim())
    .filter((message): message is string => Boolean(message));
  return collected.length > 0 ? collected.join(" ") : null;
}

function createRitualSafeWorldState(): WorldState {
  return {
    mode: "bloom",
    seed: "ritual-safe-local",
    entropy: 0.18,
    fog_density: 0.4,
    bloom_strength: 0.22,
    particle_density: 0.2,
    gravity: 0.34,
    color_temperature: 0.28,
    typography_weight: 420,
    audio_intensity: 0.1,
    palette: ["#000000", "#050507", "#72f7ff", "#8a5cff", "#5fffc2"],
  };
}

function resolveDeviceClass(): SessionInitRequest["device_class"] {
  if (typeof window === "undefined") {
    return "unknown";
  }

  if (window.innerWidth >= 1180) {
    return "desktop";
  }
  if (window.innerWidth >= 768) {
    return "tablet";
  }
  if (window.innerWidth > 0) {
    return "mobile";
  }
  return "unknown";
}

function buildInitialRequest(): SessionInitRequest {
  const locale = typeof navigator === "undefined" ? "en-US" : navigator.language ?? "en-US";
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderMode =
    typeof document === "undefined"
      ? "static"
      : resolveRendererMode(detectRendererCapabilities(document));

  return {
    locale,
    device_class: resolveDeviceClass(),
    render_mode: renderMode,
    prefers_reduced_motion: prefersReducedMotion,
    timezone_offset_minutes:
      typeof Date === "undefined" ? 0 : Math.max(-840, Math.min(840, -new Date().getTimezoneOffset())),
  };
}

function describeBootstrapError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return `${error.message} The environment is continuing in ritual-safe mode.`;
  }
  return "The backend did not complete the session bootstrap. The environment is continuing in ritual-safe mode.";
}
