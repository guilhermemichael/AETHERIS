export class TypographyController {
  constructor(private readonly container: HTMLElement) {}

  update(weight: number) {
    this.container.style.setProperty("--type-weight", `${weight}`);
  }
}
