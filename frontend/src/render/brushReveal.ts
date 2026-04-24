import type { LocalInputSnapshot } from "../biometrics/localInput";

export class BrushRevealController {
  constructor(private readonly container: HTMLElement) {}

  update(input: LocalInputSnapshot) {
    this.container.style.setProperty("--brush-x", `${input.pointerX * 100}%`);
    this.container.style.setProperty("--brush-y", `${input.pointerY * 100}%`);
    this.container.style.setProperty(
      "--brush-energy",
      `${Math.min(1, 0.35 + input.dwell * 0.55 + input.cameraEnergy * 0.15)}`,
    );
  }
}
