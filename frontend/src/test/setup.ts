import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

class ResizeObserverMock {
  observe() {}
  disconnect() {}
  unobserve() {}
}

class AudioContextMock {
  state: "running" | "suspended" = "running";
  currentTime = 0;
  destination = {};

  createOscillator() {
    return {
      type: "sine",
      frequency: {
        value: 0,
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
    };
  }

  createGain() {
    return {
      gain: {
        value: 0,
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }

  createAnalyser() {
    return {
      fftSize: 0,
      frequencyBinCount: 32,
      getByteFrequencyData: (values: Uint8Array) => values.fill(2),
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }

  createMediaStreamSource() {
    return {
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }

  resume() {
    this.state = "running";
    return Promise.resolve();
  }

  close() {
    return Promise.resolve();
  }
}

class MediaStreamTrackMock {
  stop() {}
}

class MediaStreamMock {
  getTracks() {
    return [new MediaStreamTrackMock()];
  }
}

Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  value: ResizeObserverMock,
});

Object.defineProperty(window, "AudioContext", {
  writable: true,
  value: AudioContextMock,
});

Object.defineProperty(window, "MediaStream", {
  writable: true,
  value: MediaStreamMock,
});

Object.defineProperty(HTMLMediaElement.prototype, "play", {
  writable: true,
  value: vi.fn().mockResolvedValue(undefined),
});

Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  writable: true,
  value: vi.fn(() => ({})),
});

