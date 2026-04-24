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
import type { ConsentState, SessionInitRequest } from "../api/contracts";
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

  const { consent, hydrateFromInit, applyConsent, setWebsocketConnected, clearSession } =
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
    pulseTimerRef.current = window.setTimeout(() => setPhase("pulse"), 280);
    consentTimerRef.current = window.setTimeout(() => setPhase("consent"), 1120);

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

    let nextMicrophone: { stop: () => void } | null = null;
    let nextCamera: { stop: () => void } | null = null;

    try {
      const permissionResult = await requestMediaPermissions(preferences);
      setMicrophoneState(permissionResult.microphone.granted ? "granted" : "denied");
      setCameraState(permissionResult.camera.granted ? "granted" : "denied");

      if (permissionResult.microphone.stream) {
        nextMicrophone = await startMicrophoneCapture(permissionResult.microphone.stream, (value) => {
          mergeLocalInput({ breathRate: value });
        });
      }

      if (permissionResult.camera.stream) {
        nextCamera = await startCameraCapture(permissionResult.camera.stream, (value) => {
          mergeLocalInput({ cameraEnergy: value, attention: Math.min(1, 0.62 + value * 0.3) });
        });
      }

      const initResponse = await initSession(buildInitialRequest());
      hydrateFromInit(initResponse);
      setWorldState(initResponse.world_state);

      const consentState = buildConsentState(preferences, permissionResult);
      const consentResponse = await updateConsent(initResponse.access_token, consentState);

      microphoneRef.current?.stop();
      cameraRef.current?.stop();
      microphoneRef.current = nextMicrophone;
      cameraRef.current = nextCamera;
      nextMicrophone = null;
      nextCamera = null;

      applyConsent(consentResponse);
      setWorldState(consentResponse.world_state);
      mergeLocalInput({
        ...defaultLocalInputSnapshot,
        breathRate: useWorldStore.getState().localInput.breathRate,
        cameraEnergy: useWorldStore.getState().localInput.cameraEnergy,
      });

      const permissionNotice = summarizePermissionIssues(permissionResult);
      if (permissionNotice) {
        setNotice(permissionNotice);
      }

      const wsClient = new AetherisWsClient(initResponse.access_token, {
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
      wsClient.connect({ roomId: initResponse.room_id });

      setPhase("world");
    } catch (caughtError) {
      stopControllers(nextMicrophone, nextCamera);
      setPhase("consent");
      setError(describeAppError(caughtError, preferences));
    } finally {
      setSubmitting(false);
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

function describeAppError(error: unknown, preferences: ConsentPreferences): string {
  if (preferences.microphone) {
    return explainMicrophoneError(error);
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unable to complete the consent handshake.";
}
