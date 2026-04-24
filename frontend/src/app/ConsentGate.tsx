import type { ConsentPreferences, MediaCapability } from "../biometrics/permissions";

interface ConsentGateProps {
  preferences: ConsentPreferences;
  microphoneCapability: MediaCapability;
  cameraCapability: MediaCapability;
  notice: string | null;
  submitting: boolean;
  onChange: (patch: Partial<ConsentPreferences>) => void;
  onSubmit: () => void;
}

export function ConsentGate({
  preferences,
  microphoneCapability,
  cameraCapability,
  notice,
  submitting,
  onChange,
  onSubmit,
}: ConsentGateProps) {
  return (
    <section className="consent-card">
      <p className="eyebrow">Handshake</p>
      <h2>Let the environment attune to your presence.</h2>
      <p>
        Camera and microphone stay local. Raw media is never uploaded. If you decline, AETHERIS
        continues in interaction-only mode.
      </p>

      <label className="consent-toggle">
        <span>Reactive soundscape</span>
        <input
          type="checkbox"
          checked={preferences.audio}
          onChange={(event) => onChange({ audio: event.target.checked })}
        />
      </label>

      <label className="consent-toggle">
        <span>Microphone-driven presence</span>
        <input
          type="checkbox"
          checked={preferences.microphone}
          disabled={!microphoneCapability.requestable}
          onChange={(event) =>
            onChange({
              microphone: event.target.checked,
              localBiometrics: event.target.checked ? preferences.localBiometrics : false,
            })
          }
        />
      </label>
      {microphoneCapability.reason ? (
        <p className="consent-hint">{microphoneCapability.reason}</p>
      ) : null}

      <label className="consent-toggle">
        <span>Camera-based local framing</span>
        <input
          type="checkbox"
          checked={preferences.camera}
          disabled={!cameraCapability.requestable}
          onChange={(event) => onChange({ camera: event.target.checked })}
        />
      </label>
      {cameraCapability.reason ? <p className="consent-hint">{cameraCapability.reason}</p> : null}

      <label className="consent-toggle">
        <span>Local biometrics proxy</span>
        <input
          type="checkbox"
          checked={preferences.localBiometrics}
          disabled={!preferences.microphone}
          onChange={(event) => onChange({ localBiometrics: event.target.checked })}
        />
      </label>

      <label className="consent-toggle">
        <span>Anonymous presence sync readiness</span>
        <input
          type="checkbox"
          checked={preferences.presence}
          onChange={(event) => onChange({ presence: event.target.checked })}
        />
      </label>

      <p className="consent-hint">
        Browser prompts only appear after you click <strong>Begin calibration</strong>.
      </p>
      {notice ? <p className="consent-hint consent-notice">{notice}</p> : null}

      <button className="primary-action" onClick={onSubmit}>
        {submitting ? "Calibrating..." : "Begin calibration"}
      </button>
    </section>
  );
}
