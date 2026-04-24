import type { components } from "../generated/api-types";

export type ConsentState = components["schemas"]["ConsentState"];
export type ConsentUpdateRequest = components["schemas"]["ConsentUpdateRequest"];
export type ConsentUpdateResponse = components["schemas"]["ConsentUpdateResponse"];
export type FeatureFlags = components["schemas"]["FeatureFlags"];
export type SessionInitRequest = components["schemas"]["SessionInitRequest"];
export type SessionInitResponse = components["schemas"]["SessionInitResponse"];
export type SessionMeResponse = components["schemas"]["SessionMeResponse"];
export type WorldRecomputeRequest = components["schemas"]["WorldRecomputeRequest"];
export type WorldState = components["schemas"]["WorldStateSchema"];

export type DeviceClass = SessionInitRequest["device_class"];
export type RenderMode = SessionInitRequest["render_mode"];
export type WorldMode = WorldState["mode"];
