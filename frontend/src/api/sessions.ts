import type {
  ConsentState,
  ConsentUpdateResponse,
  SessionInitRequest,
  SessionInitResponse,
  SessionMeResponse,
} from "./contracts";
import { apiRequest } from "./client";

export function initSession(payload: SessionInitRequest): Promise<SessionInitResponse> {
  return apiRequest<SessionInitResponse>("/api/v1/sessions/init", {
    method: "POST",
    body: payload,
  });
}

export function getSessionMe(token: string): Promise<SessionMeResponse> {
  return apiRequest<SessionMeResponse>("/api/v1/sessions/me", {
    token,
  });
}

export function updateConsent(
  token: string,
  consent: ConsentState,
): Promise<ConsentUpdateResponse> {
  return apiRequest<ConsentUpdateResponse>("/api/v1/sessions/consent", {
    method: "POST",
    token,
    body: {
      consent,
    },
  });
}

export function deleteSession(token: string): Promise<void> {
  return apiRequest<void>("/api/v1/sessions/me", {
    method: "DELETE",
    token,
  });
}
