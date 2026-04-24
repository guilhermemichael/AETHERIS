import { buildWebSocketUrl } from "../api/client";
import type { WSClientMessage, WSServerMessage } from "./protocol";

interface WsHandlers {
  onOpen?: () => void;
  onClose?: () => void;
  onMessage?: (message: WSServerMessage) => void;
}

export class AetherisWsClient {
  private socket: WebSocket | null = null;
  private heartbeatId: number | null = null;

  constructor(
    private readonly token: string,
    private readonly handlers: WsHandlers = {},
  ) {}

  connect({ roomId }: { roomId?: string } = {}) {
    this.socket = new WebSocket(buildWebSocketUrl(this.token));
    this.socket.addEventListener("open", () => {
      this.handlers.onOpen?.();
      this.send("session.join", roomId ? { room_id: roomId } : {});
      this.heartbeatId = window.setInterval(() => this.send("ping", {}), 10000);
    });
    this.socket.addEventListener("message", (event) => {
      try {
        const payload = JSON.parse(event.data) as WSServerMessage;
        this.handlers.onMessage?.(payload);
      } catch {
        return;
      }
    });
    this.socket.addEventListener("close", () => {
      if (this.heartbeatId !== null) {
        window.clearInterval(this.heartbeatId);
        this.heartbeatId = null;
      }
      this.handlers.onClose?.();
    });
  }

  send(type: WSClientMessage["type"], payload: Record<string, unknown>) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    const message: WSClientMessage = {
      type,
      payload,
      ts: Date.now(),
    };
    this.socket.send(JSON.stringify(message));
  }

  close() {
    if (this.heartbeatId !== null) {
      window.clearInterval(this.heartbeatId);
      this.heartbeatId = null;
    }
    this.socket?.close();
    this.socket = null;
  }
}
