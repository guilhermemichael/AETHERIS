import { create } from "zustand";

export type PermissionState = "idle" | "granted" | "denied" | "unsupported";

interface InputStore {
  microphoneState: PermissionState;
  cameraState: PermissionState;
  setMicrophoneState: (state: PermissionState) => void;
  setCameraState: (state: PermissionState) => void;
  reset: () => void;
}

export const useInputStore = create<InputStore>((set) => ({
  microphoneState: "idle",
  cameraState: "idle",
  setMicrophoneState: (microphoneState) => set({ microphoneState }),
  setCameraState: (cameraState) => set({ cameraState }),
  reset: () =>
    set({
      microphoneState: "idle",
      cameraState: "idle",
    }),
}));
