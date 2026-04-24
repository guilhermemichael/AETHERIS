import type { ConsentState } from "../api/contracts";

type MediaKind = "microphone" | "camera";

export interface MediaCapability {
  requestable: boolean;
  reason: string | null;
}

export interface ConsentPreferences {
  microphone: boolean;
  camera: boolean;
  localBiometrics: boolean;
  audio: boolean;
  presence: boolean;
}

export interface MediaPermissionOutcome {
  granted: boolean;
  stream: MediaStream | null;
  error: string | null;
}

export interface MediaPermissionResult {
  microphone: MediaPermissionOutcome;
  camera: MediaPermissionOutcome;
}

const TRUSTED_LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function getMediaCapability(
  kind: MediaKind,
  currentWindow: Pick<Window, "isSecureContext" | "location" | "navigator"> = window,
): MediaCapability {
  const hostname = currentWindow.location?.hostname ?? "";
  const secureContext =
    currentWindow.isSecureContext || TRUSTED_LOCAL_HOSTS.has(hostname.toLowerCase());
  const supported = Boolean(currentWindow.navigator.mediaDevices?.getUserMedia);

  if (!supported) {
    return {
      requestable: false,
      reason: `${capitalize(kind)} capture is not supported in this browser.`,
    };
  }

  if (!secureContext) {
    return {
      requestable: false,
      reason: `${capitalize(kind)} capture requires HTTPS or localhost.`,
    };
  }

  return {
    requestable: true,
    reason: null,
  };
}

export async function requestMediaPermissions(
  preferences: ConsentPreferences,
): Promise<MediaPermissionResult> {
  const microphone = preferences.microphone
    ? await requestSingleMedia("microphone")
    : { granted: false, stream: null, error: null };

  const camera = preferences.camera
    ? await requestSingleMedia("camera")
    : { granted: false, stream: null, error: null };

  return {
    microphone,
    camera,
  };
}

export function buildConsentState(
  preferences: ConsentPreferences,
  permissions: MediaPermissionResult,
): ConsentState {
  return {
    microphone: preferences.microphone && permissions.microphone.granted,
    camera: preferences.camera && permissions.camera.granted,
    local_biometrics:
      preferences.localBiometrics &&
      preferences.microphone &&
      permissions.microphone.granted,
    audio: preferences.audio,
    presence: preferences.presence,
  };
}

export function summarizePermissionIssues(result: MediaPermissionResult): string | null {
  const errors = [result.microphone.error, result.camera.error].filter(
    (value): value is string => Boolean(value),
  );
  if (errors.length === 0) {
    return null;
  }
  return errors.join(" ");
}

async function requestSingleMedia(kind: MediaKind): Promise<MediaPermissionOutcome> {
  const capability = getMediaCapability(kind);
  if (!capability.requestable) {
    return {
      granted: false,
      stream: null,
      error: capability.reason,
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio:
        kind === "microphone"
          ? {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: false,
            }
          : false,
      video:
        kind === "camera"
          ? {
              facingMode: "user",
              width: { ideal: 640 },
              height: { ideal: 480 },
              frameRate: { ideal: 24, max: 30 },
            }
          : false,
    });

    return {
      granted: true,
      stream,
      error: null,
    };
  } catch (error) {
    return {
      granted: false,
      stream: null,
      error: describeMediaError(kind, error),
    };
  }
}

function describeMediaError(kind: MediaKind, error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return `${capitalize(kind)} access was blocked or dismissed by the browser.`;
    }
    if (error.name === "NotFoundError") {
      return `No ${kind} device was detected.`;
    }
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return `Unable to initialize ${kind} capture.`;
}

function capitalize(value: string): string {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}
