import { create } from "zustand";

type ExperiencePhase = "void" | "pulse" | "consent" | "authenticating" | "world";

interface BrushState {
  x: number;
  y: number;
}

interface UiStore {
  phase: ExperiencePhase;
  activeNodeId: string;
  brush: BrushState;
  error: string | null;
  setPhase: (phase: ExperiencePhase) => void;
  setActiveNodeId: (nodeId: string) => void;
  setBrush: (brush: BrushState) => void;
  setError: (message: string | null) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  phase: "void",
  activeNodeId: "about",
  brush: {
    x: 50,
    y: 50,
  },
  error: null,
  setPhase: (phase) => set({ phase }),
  setActiveNodeId: (activeNodeId) => set({ activeNodeId }),
  setBrush: (brush) => set({ brush }),
  setError: (error) => set({ error }),
}));

