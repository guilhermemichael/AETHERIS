import type {
  ConsentUpdateRequest,
  ConsentUpdateResponse,
  SessionInitRequest,
  SessionInitResponse,
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`AETHERIS API error ${response.status}`);
  }

  return (await response.json()) as T;
}

export function initSession(payload: SessionInitRequest): Promise<SessionInitResponse> {
  return request<SessionInitResponse>("/api/v1/sessions/init", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateConsent(payload: ConsentUpdateRequest): Promise<ConsentUpdateResponse> {
  return request<ConsentUpdateResponse>("/api/v1/sessions/consent", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

