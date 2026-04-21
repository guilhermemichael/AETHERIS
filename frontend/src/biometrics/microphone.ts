import { estimateBreathRate } from "./localInput";

export interface MicrophoneController {
  stop: () => void;
}

interface MicrophoneCapability {
  requestable: boolean;
  reason: string | null;
}

const TRUSTED_LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function getMicrophoneCapability(
  currentWindow: Pick<Window, "isSecureContext" | "location" | "navigator"> = window,
): MicrophoneCapability {
  const hostname = currentWindow.location?.hostname ?? "";
  const secureContext =
    currentWindow.isSecureContext || TRUSTED_LOCAL_HOSTS.has(hostname.toLowerCase());
  const supported = Boolean(currentWindow.navigator.mediaDevices?.getUserMedia);

  if (!supported) {
    return {
      requestable: false,
      reason: "Microphone capture is not supported in this browser.",
    };
  }

  if (!secureContext) {
    return {
      requestable: false,
      reason: "Microphone capture requires HTTPS or localhost.",
    };
  }

  return {
    requestable: true,
    reason: null,
  };
}

export function explainMicrophoneError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "Microphone access was blocked or dismissed by the browser.";
    }
    if (error.name === "NotFoundError") {
      return "No microphone input device was detected.";
    }
    if (error.name === "NotReadableError") {
      return "The microphone is busy or unavailable right now.";
    }
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to initialize microphone capture.";
}

export async function startMicrophoneCapture(
  onBreathRate: (breathRate: number) => void,
): Promise<MicrophoneController> {
  const capability = getMicrophoneCapability();

  if (!capability.requestable) {
    throw new Error(capability.reason ?? "Microphone capture is not available.");
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const audioContext = new AudioContext();

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;

  const source = audioContext.createMediaStreamSource(stream);
  source.connect(analyser);

  const samples = new Uint8Array(analyser.frequencyBinCount);
  let currentBreathRate = 0;
  let rafId = 0;

  const sample = () => {
    analyser.getByteFrequencyData(samples);
    const average = samples.reduce((sum, value) => sum + value, 0) / samples.length / 255;
    currentBreathRate = estimateBreathRate(average, currentBreathRate);
    onBreathRate(currentBreathRate);
    rafId = window.requestAnimationFrame(sample);
  };

  sample();

  return {
    stop: () => {
      window.cancelAnimationFrame(rafId);
      source.disconnect();
      analyser.disconnect();
      stream.getTracks().forEach((track) => track.stop());
      void audioContext.close();
    },
  };
}

