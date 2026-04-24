import type { WorldRecomputeRequest, WorldState } from "./contracts";
import { apiRequest } from "./client";

export function getWorldState(token: string): Promise<WorldState> {
  return apiRequest<WorldState>("/api/v1/world/state", {
    token,
  });
}

export function recomputeWorld(
  token: string,
  payload: WorldRecomputeRequest = { reason: "manual" },
): Promise<WorldState> {
  return apiRequest<WorldState>("/api/v1/world/recompute", {
    method: "POST",
    token,
    body: payload,
  });
}
