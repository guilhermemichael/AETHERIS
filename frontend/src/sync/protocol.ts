export type ClientEventType =
  | "session.join"
  | "presence.update"
  | "local.input"
  | "world.interact"
  | "ping";

export type ServerEventType =
  | "session.accepted"
  | "world.patch"
  | "presence.snapshot"
  | "presence.left"
  | "error"
  | "pong";

export interface WSClientMessage {
  type: ClientEventType;
  payload: Record<string, unknown>;
  ts: number;
}

export interface WSServerMessage {
  type: ServerEventType;
  payload: Record<string, unknown>;
  ts: number;
}
