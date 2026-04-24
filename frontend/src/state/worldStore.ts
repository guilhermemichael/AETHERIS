import { create } from "zustand";

import type { WorldState } from "../api/contracts";
import type { LocalInputSnapshot } from "../biometrics/localInput";
import type { RendererMode } from "../render/capabilities";

export const defaultLocalInputSnapshot: LocalInputSnapshot = {
  breathRate: 0,
  cameraEnergy: 0,
  attention: 0.72,
  motionTension: 0.18,
  pointerX: 0.5,
  pointerY: 0.5,
  dwell: 0,
  lastInteractionAt: Date.now(),
};

interface WorldStore {
  worldState: WorldState | null;
  localInput: LocalInputSnapshot;
  rendererMode: RendererMode;
  setWorldState: (next: WorldState) => void;
  setRendererMode: (mode: RendererMode) => void;
  mergeLocalInput: (patch: Partial<LocalInputSnapshot>) => void;
}

export const useWorldStore = create<WorldStore>((set) => ({
  worldState: null,
  localInput: defaultLocalInputSnapshot,
  rendererMode: "static",
  setWorldState: (next) => set({ worldState: next }),
  setRendererMode: (rendererMode) => set({ rendererMode }),
  mergeLocalInput: (patch) =>
    set((state) => ({
      localInput: {
        ...state.localInput,
        ...patch,
      },
    })),
}));

