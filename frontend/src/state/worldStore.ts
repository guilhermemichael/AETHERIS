import { create } from "zustand";

import type { LocalInputSnapshot, WorldState } from "../app/types";

export const defaultLocalInputSnapshot: LocalInputSnapshot = {
  breathRate: 0,
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
  setWorldState: (next: WorldState) => void;
  mergeLocalInput: (patch: Partial<LocalInputSnapshot>) => void;
}

export const useWorldStore = create<WorldStore>((set) => ({
  worldState: null,
  localInput: defaultLocalInputSnapshot,
  setWorldState: (next) => set({ worldState: next }),
  mergeLocalInput: (patch) =>
    set((state) => ({
      localInput: {
        ...state.localInput,
        ...patch,
      },
    })),
}));

