import { create } from "zustand";

import type { ConsentState, ConsentUpdateResponse, FeatureFlags, SessionInitResponse } from "../app/types";

interface SessionSnapshot {
  sessionId: string | null;
  accessToken: string | null;
  seed: string | null;
  roomId: string | null;
  featureFlags: FeatureFlags | null;
  consentRequired: string[];
  consent: ConsentState;
}

interface SessionStore extends SessionSnapshot {
  hydrateFromInit: (payload: SessionInitResponse) => void;
  applyConsent: (payload: ConsentUpdateResponse) => void;
}

const defaultConsent: ConsentState = {
  mic: false,
  camera: false,
  local_biometrics: false,
  presence_sync: true,
  audio_reactive: true,
};

export const useSessionStore = create<SessionStore>((set) => ({
  sessionId: null,
  accessToken: null,
  seed: null,
  roomId: null,
  featureFlags: null,
  consentRequired: [],
  consent: defaultConsent,
  hydrateFromInit: (payload) =>
    set({
      sessionId: payload.session_id,
      accessToken: payload.access_token,
      seed: payload.seed,
      roomId: payload.room_id,
      featureFlags: payload.feature_flags,
      consentRequired: payload.consent_required,
    }),
  applyConsent: (payload) =>
    set({
      consent: payload.consent,
      consentRequired: payload.consent_required,
      featureFlags: payload.feature_flags,
    }),
}));

