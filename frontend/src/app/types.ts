export type DeviceClass = "desktop" | "tablet" | "mobile" | "unknown";

export interface FeatureFlags {
  webgpu_preferred: boolean;
  reactive_audio: boolean;
  brush_reveal: boolean;
  social_presence: boolean;
  temporal_echoes: boolean;
}

export interface WorldState {
  mode: string;
  fog_density: number;
  gravity: number;
  bloom: number;
  entropy: number;
  particle_count: number;
  palette: string[];
  typography_weight: number;
  soundscape: string;
  reveal_radius: number;
  collective_luminosity: number;
}

export interface SessionInitRequest {
  locale: string;
  device_class: DeviceClass;
  prefers_reduced_motion: boolean;
  wants_audio: boolean;
  wants_biometrics: boolean;
}

export interface SessionInitResponse {
  session_id: string;
  access_token: string;
  seed: string;
  room_id: string;
  consent_required: string[];
  world_state: WorldState;
  feature_flags: FeatureFlags;
}

export interface ConsentState {
  mic: boolean;
  camera: boolean;
  local_biometrics: boolean;
  presence_sync: boolean;
  audio_reactive: boolean;
}

export interface ConsentUpdateRequest extends ConsentState {
  session_id: string;
}

export interface ConsentUpdateResponse {
  session_id: string;
  consent: ConsentState;
  consent_required: string[];
  world_state: WorldState;
  feature_flags: FeatureFlags;
}

export interface LocalInputSnapshot {
  breathRate: number;
  attention: number;
  motionTension: number;
  pointerX: number;
  pointerY: number;
  dwell: number;
  lastInteractionAt: number;
}

export interface ContentNode {
  id: string;
  label: string;
  title: string;
  eyebrow: string;
  body: string;
  accent: string;
  anchor: {
    top: string;
    left: string;
  };
}

