export interface CameraController {
  stop: () => void;
}

export async function startCameraCapture(
  stream: MediaStream,
  onCameraEnergy: (energy: number) => void,
): Promise<CameraController> {
  const video = document.createElement("video");
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;

  try {
    await Promise.race([
      video.play().catch(() => undefined),
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, 240);
      }),
    ]);
  } catch {
    onCameraEnergy(0.35);
  }

  let rafId = 0;

  const loop = () => {
    const active = video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
    const energy = active ? 0.45 + Math.sin(video.currentTime * 2.1) * 0.08 : 0.18;
    onCameraEnergy(Math.max(0, Math.min(1, energy)));
    rafId = window.requestAnimationFrame(loop);
  };

  loop();

  return {
    stop: () => {
      window.cancelAnimationFrame(rafId);
      video.pause();
      stream.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
      onCameraEnergy(0);
    },
  };
}
