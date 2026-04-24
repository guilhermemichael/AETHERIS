from collections import defaultdict
from typing import Any
from uuid import UUID

from fastapi import WebSocket

from app.schemas.ws import WSMessage
from app.services.telemetry_service import TelemetryService
from app.websocket.rooms import RoomRegistry


class WebSocketManager:
    def __init__(self, telemetry: TelemetryService) -> None:
        self.telemetry = telemetry
        self.rooms = RoomRegistry()
        self.connections: dict[str, dict[UUID, set[WebSocket]]] = defaultdict(lambda: defaultdict(set))

    async def connect(self, session_id: UUID, websocket: WebSocket) -> None:
        await websocket.accept()
        self.connections["_connected"][session_id].add(websocket)
        self.telemetry.ws_opened()

    async def disconnect(self, session_id: UUID, websocket: WebSocket) -> str | None:
        self.connections["_connected"][session_id].discard(websocket)
        if not self.connections["_connected"][session_id]:
            self.connections["_connected"].pop(session_id, None)
        room_id = self.rooms.get_room(session_id)
        if room_id is not None:
            self.connections[room_id][session_id].discard(websocket)
            if not self.connections[room_id][session_id]:
                self.connections[room_id].pop(session_id, None)
            if not self.connections[room_id]:
                self.connections.pop(room_id, None)
            self.rooms.remove(session_id)
        self.telemetry.ws_closed()
        return room_id

    def join_room(self, room_id: str, session_id: UUID, websocket: WebSocket) -> None:
        self.rooms.set_room(session_id, room_id)
        self.connections[room_id][session_id].add(websocket)

    async def send(self, websocket: WebSocket, message_type: str, payload: dict[str, Any]) -> None:
        await websocket.send_json(WSMessage(type=message_type, payload=payload, ts=_timestamp_ms()).model_dump())

    async def broadcast(
        self,
        room_id: str,
        message_type: str,
        payload: dict[str, Any],
        *,
        exclude_session_id: UUID | None = None,
    ) -> None:
        for session_id, sockets in self.connections.get(room_id, {}).items():
            if exclude_session_id is not None and session_id == exclude_session_id:
                continue
            for websocket in list(sockets):
                await self.send(websocket, message_type, payload)


def _timestamp_ms() -> int:
    import time

    return int(time.time() * 1000)
