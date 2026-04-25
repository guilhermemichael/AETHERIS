import { create } from "zustand";

import type {
  ConsentState,
  ConsentUpdateResponse,
  FeatureFlags,
  SessionInitResponse,
  SessionMeResponse,
} from "../api/contracts";

interface SessionSnapshot {
  sessionId: string | null;
  accessToken: string | null;
  expiresAt: string | null;
  roomId: string | null;
  featureFlags: FeatureFlags | null;
  consent: ConsentState;
  websocketConnected: boolean;
}

interface SessionStore extends SessionSnapshot {
  hydrateFromInit: (payload: SessionInitResponse) => void;
  hydrateFromMe: (payload: SessionMeResponse) => void;
  applyConsent: (payload: ConsentUpdateResponse) => void;
  setLocalConsent: (consent: ConsentState) => void;
  setWebsocketConnected: (connected: boolean) => void;
  clearSession: () => void;
}

const defaultConsent: ConsentState = {
  microphone: false,
  camera: false,
  local_biometrics: false,
  audio: false,
  presence: false,
};

export const useSessionStore = create<SessionStore>((set) => ({
  sessionId: null,
  accessToken: null,
  expiresAt: null,
  roomId: null,
  featureFlags: null,
  consent: defaultConsent,
  websocketConnected: false,
  hydrateFromInit: (payload) =>
    set({
      sessionId: payload.session_id,
      accessToken: payload.access_token,
      expiresAt: payload.expires_at,
      roomId: payload.room_id,
      featureFlags: payload.feature_flags,
      consent: payload.consent,
    }),
  hydrateFromMe: (payload) =>
    set({
      sessionId: payload.session_id,
      expiresAt: payload.expires_at,
      roomId: payload.room_id,
      featureFlags: payload.feature_flags,
      consent: payload.consent,
    }),
  applyConsent: (payload) =>
    set({
      consent: payload.consent,
    }),
  setLocalConsent: (consent) =>
    set({
      consent,
    }),
  setWebsocketConnected: (websocketConnected) => set({ websocketConnected }),
  clearSession: () =>
    set({
      sessionId: null,
      accessToken: null,
      expiresAt: null,
      roomId: null,
      featureFlags: null,
      consent: defaultConsent,
      websocketConnected: false,
    }),
}));

