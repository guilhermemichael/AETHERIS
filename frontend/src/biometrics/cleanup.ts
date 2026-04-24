export interface DisposableController {
  stop: () => void;
}

export function stopControllers(...controllers: Array<DisposableController | null | undefined>) {
  for (const controller of controllers) {
    controller?.stop();
  }
}
