import type { ConsentUpdateRequest } from "../app/types";

export interface ConsentPreferences {
  sessionId: string;
  enableMic: boolean;
  enableBiometrics: boolean;
  enableAudio: boolean;
  enablePresence: boolean;
}

export function buildConsentPayload(preferences: ConsentPreferences): ConsentUpdateRequest {
  const biometricsEnabled = preferences.enableMic && preferences.enableBiometrics;

  return {
    session_id: preferences.sessionId,
    mic: preferences.enableMic,
    camera: false,
    local_biometrics: biometricsEnabled,
    presence_sync: preferences.enablePresence,
    audio_reactive: preferences.enableAudio,
  };
}

