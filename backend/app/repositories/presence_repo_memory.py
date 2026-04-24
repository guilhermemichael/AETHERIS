from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from app.repositories.protocols import PresenceRepositoryProtocol


class MemoryPresenceRepository(PresenceRepositoryProtocol):
    def __init__(self) -> None:
        self._rooms: dict[str, dict[UUID, dict[str, Any]]] = {}
        self._heartbeats: dict[UUID, datetime] = {}

    async def heartbeat(self, session_id: UUID) -> None:
        self._heartbeats[session_id] = datetime.now(UTC)

    async def join_room(self, room_id: str, session_id: UUID, payload: dict[str, Any]) -> None:
        room = self._rooms.setdefault(room_id, {})
        room[session_id] = payload
        await self.heartbeat(session_id)

    async def update_presence(self, room_id: str, session_id: UUID, payload: dict[str, Any]) -> None:
        await self.join_room(room_id, session_id, payload)

    async def list_room(self, room_id: str) -> list[dict[str, Any]]:
        return list(self._rooms.get(room_id, {}).values())

    async def remove_session(self, room_id: str, session_id: UUID) -> None:
        room = self._rooms.get(room_id)
        if room is None:
            return
        room.pop(session_id, None)
        if not room:
            self._rooms.pop(room_id, None)

    async def clear_session(self, session_id: UUID) -> None:
        for room_id in list(self._rooms):
            await self.remove_session(room_id, session_id)
        self._heartbeats.pop(session_id, None)

    async def ping(self) -> bool:
        return True
