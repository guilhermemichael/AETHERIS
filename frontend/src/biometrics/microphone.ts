import { estimateBreathRate } from "./localInput";

interface MicrophoneController {
  stop: () => void;
}

export async function startMicrophoneCapture(
  onBreathRate: (breathRate: number) => void,
): Promise<MicrophoneController> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone capture is not supported");
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const audioContext = new AudioContext();
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

