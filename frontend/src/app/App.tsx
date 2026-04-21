import { useEffect, useMemo, useRef, useState, useTransition, type CSSProperties } from "react";

import { initSession, updateConsent } from "./api";
import { RenderViewport } from "./RenderViewport";
import type { ConsentState, SessionInitRequest } from "./types";
import { siteManifest } from "../content/siteManifest";
import { createPointerSnapshot, decayLocalInput } from "../biometrics/localInput";
import {
  explainMicrophoneError,
  getMicrophoneCapability,
  startMicrophoneCapture,
} from "../biometrics/microphone";
import { buildConsentPayload } from "../biometrics/privacy";
import { ReactiveSoundscape } from "../render/audio";
import { useSessionStore } from "../state/sessionStore";
import { defaultLocalInputSnapshot, useWorldStore } from "../state/worldStore";
import { useUiStore } from "../state/uiStore";

const initialRequest = buildInitialRequest();

const defaultConsentForm = {
  enableMic: false,
  enableBiometrics: false,
  enableAudio: true,
  enablePresence: true,
};

export function App() {
  const [isBooting, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [consentForm, setConsentForm] = useState(defaultConsentForm);
  const [syncingConsent, setSyncingConsent] = useState(false);
  const microphoneRef = useRef<{ stop: () => void } | null>(null);
  const soundscapeRef = useRef<ReactiveSoundscape | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const bootstrapStartedRef = useRef(false);
  const consentTransitionRef = useRef<number | null>(null);
  const microphoneCapability = useMemo(() => getMicrophoneCapability(), []);

  const { sessionId, consent, hydrateFromInit, applyConsent } = useSessionStore();
  const { worldState, localInput, mergeLocalInput, setWorldState } = useWorldStore();
  const { phase, activeNodeId, brush, setActiveNodeId, setBrush, setPhase } = useUiStore();

  useEffect(() => {
    if (bootstrapStartedRef.current) {
      return;
    }

    bootstrapStartedRef.current = true;

    startTransition(() => {
      void bootstrap();
    });

    async function bootstrap() {
      try {
        const response = await initSession(initialRequest);
        hydrateFromInit(response);
        setWorldState(response.world_state);
        setPhase("pulse");
        consentTransitionRef.current = window.setTimeout(() => setPhase("consent"), 1400);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Unknown bootstrap error");
      }
    }

    return () => {
      if (consentTransitionRef.current !== null) {
        window.clearTimeout(consentTransitionRef.current);
        consentTransitionRef.current = null;
      }
    };
  }, [hydrateFromInit, setPhase, setWorldState]);

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
    if (!worldState || !consent.audio_reactive || phase !== "world") {
      soundscapeRef.current?.stop();
      soundscapeRef.current = null;
      return;
    }

    const soundscape = new ReactiveSoundscape();
    soundscapeRef.current = soundscape;
    void soundscape.start();

    return () => {
      soundscape.stop();
      soundscapeRef.current = null;
    };
  }, [consent.audio_reactive, phase, worldState]);

  useEffect(() => {
    if (!worldState || !soundscapeRef.current || phase !== "world") {
      return;
    }

    soundscapeRef.current.update(worldState, localInput);
  }, [localInput, phase, worldState]);

  useEffect(() => {
    return () => {
      microphoneRef.current?.stop();
      soundscapeRef.current?.stop();
    };
  }, []);

  const activeNode = useMemo(
    () => siteManifest.find((entry) => entry.id === activeNodeId) ?? siteManifest[0],
    [activeNodeId],
  );

  const handleConsentSubmit = async () => {
    if (!sessionId || syncingConsent) {
      return;
    }

    setError(null);
    let nextMicrophone: { stop: () => void } | null = null;

    try {
      if (consentForm.enableMic) {
        nextMicrophone = await startMicrophoneCapture((breathRate) => {
          mergeLocalInput({ breathRate });
        });
      } else {
        microphoneRef.current?.stop();
        microphoneRef.current = null;
      }

      setSyncingConsent(true);
      const response = await updateConsent(
        buildConsentPayload({
          sessionId,
          enableMic: consentForm.enableMic,
          enableBiometrics: consentForm.enableBiometrics,
          enableAudio: consentForm.enableAudio,
          enablePresence: consentForm.enablePresence,
        }),
      );

      microphoneRef.current?.stop();
      microphoneRef.current = nextMicrophone;
      nextMicrophone = null;
      applyConsent(response);
      setWorldState(response.world_state);
      mergeLocalInput({
        ...defaultLocalInputSnapshot,
        breathRate: useWorldStore.getState().localInput.breathRate,
      });
      setPhase("world");
    } catch (caughtError) {
      nextMicrophone?.stop();
      setError(
        consentForm.enableMic
          ? explainMicrophoneError(caughtError)
          : caughtError instanceof Error
            ? caughtError.message
            : "Unable to complete the consent handshake",
      );
    } finally {
      setSyncingConsent(false);
    }
  };

  return (
    <main
      ref={shellRef}
      className="app-shell"
      data-phase={phase}
      style={
        {
          "--brush-x": `${brush.x}%`,
          "--brush-y": `${brush.y}%`,
          "--accent-color": worldState?.palette[1] ?? "#68F0DA",
          "--accent-secondary": worldState?.palette[2] ?? "#8E6CFF",
          "--accent-tertiary": worldState?.palette[3] ?? "#72D4A4",
          "--type-weight": `${worldState?.typography_weight ?? 360}`,
        } as CSSProperties
      }
    >
      <RenderViewport worldState={worldState} localInput={localInput} />
      <div className="fog-layer" />
      <div className="brush-layer" />
      <div className="grain-layer" />

      <section className="hero-copy" aria-live="polite">
        <p className="eyebrow">AETHERIS</p>
        <h1>
          A responsive digital biosphere with memory-ready architecture and a ritualized
          interface.
        </h1>
        <p className="lede">
          Presence enters first. Navigation condenses later. The world blooms from typed state,
          not decorative chaos.
        </p>
      </section>

      <div className="pulse-node" aria-hidden="true" />

      {phase === "consent" ? (
        <section className="consent-panel">
          <p className="eyebrow">Handshake</p>
          <h2>Let the environment adapt to your presence.</h2>
          <p>
            Audio stays local. Raw media is never persisted or uploaded. If you decline, AETHERIS
            still renders in interaction-only mode.
          </p>

          <label className="consent-toggle">
            <span>Reactive soundscape</span>
            <input
              type="checkbox"
              checked={consentForm.enableAudio}
              onChange={(event) =>
                setConsentForm((current) => ({ ...current, enableAudio: event.target.checked }))
              }
            />
          </label>
          <label className="consent-toggle">
            <span>Microphone-driven presence</span>
            <input
              type="checkbox"
              checked={consentForm.enableMic}
              disabled={!microphoneCapability.requestable}
              onChange={(event) =>
                setConsentForm((current) => ({
                  ...current,
                  enableMic: event.target.checked,
                  enableBiometrics: event.target.checked ? current.enableBiometrics : false,
                }))
              }
            />
          </label>
          {!microphoneCapability.requestable ? (
            <p className="consent-hint">{microphoneCapability.reason}</p>
          ) : (
            <p className="consent-hint">
              Browser permission is requested only after you click <strong>Enter the biosphere</strong>.
            </p>
          )}
          <label className="consent-toggle">
            <span>Local biometrics proxy</span>
            <input
              type="checkbox"
              checked={consentForm.enableBiometrics}
              disabled={!consentForm.enableMic}
              onChange={(event) =>
                setConsentForm((current) => ({
                  ...current,
                  enableBiometrics: event.target.checked,
                }))
              }
            />
          </label>
          <label className="consent-toggle">
            <span>Anonymous presence sync readiness</span>
            <input
              type="checkbox"
              checked={consentForm.enablePresence}
              onChange={(event) =>
                setConsentForm((current) => ({ ...current, enablePresence: event.target.checked }))
              }
            />
          </label>

          <button className="primary-action" onClick={() => void handleConsentSubmit()}>
            {syncingConsent ? "Attuning..." : "Enter the biosphere"}
          </button>
        </section>
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
        <span>{isBooting ? "Bootstrapping..." : worldState ? worldState.mode : "Awaiting seed"}</span>
        <span>{error ?? describeConsent(consent)}</span>
      </footer>
    </main>
  );
}

function describeConsent(consent: ConsentState) {
  if (consent.local_biometrics && consent.mic) {
    return "Somatic input active";
  }
  if (consent.mic) {
    return "Microphone local-only";
  }
  return "Interaction-only mode";
}

function resolveDeviceClass() {
  if (typeof window === "undefined") {
    return "unknown";
  }

  const width = window.innerWidth;

  if (width >= 1180) {
    return "desktop";
  }
  if (width >= 768) {
    return "tablet";
  }
  if (width > 0) {
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

  return {
    locale,
    device_class: resolveDeviceClass(),
    prefers_reduced_motion: prefersReducedMotion,
    wants_audio: true,
    wants_biometrics: true,
  };
}
