import { create } from "zustand";

type ExperiencePhase = "void" | "pulse" | "consent" | "world";

interface BrushState {
  x: number;
  y: number;
}

interface UiStore {
  phase: ExperiencePhase;
  activeNodeId: string;
  brush: BrushState;
  setPhase: (phase: ExperiencePhase) => void;
  setActiveNodeId: (nodeId: string) => void;
  setBrush: (brush: BrushState) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  phase: "void",
  activeNodeId: "about",
  brush: {
    x: 50,
    y: 50,
  },
  setPhase: (phase) => set({ phase }),
  setActiveNodeId: (activeNodeId) => set({ activeNodeId }),
  setBrush: (brush) => set({ brush }),
}));

