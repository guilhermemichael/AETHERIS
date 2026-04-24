from typing import Any
from uuid import UUID

from app.repositories.protocols import PresenceRepositoryProtocol


class PresenceService:
    def __init__(self, repository: PresenceRepositoryProtocol) -> None:
        self.repository = repository

    async def heartbeat(self, session_id: UUID) -> None:
        await self.repository.heartbeat(session_id)

    async def join_room(self, room_id: str, session_id: UUID, payload: dict[str, Any]) -> None:
        await self.repository.join_room(room_id, session_id, payload)

    async def update_presence(self, room_id: str, session_id: UUID, payload: dict[str, Any]) -> None:
        await self.repository.update_presence(room_id, session_id, payload)

    async def list_room(self, room_id: str) -> list[dict[str, Any]]:
        return await self.repository.list_room(room_id)

    async def remove_session(self, room_id: str, session_id: UUID) -> None:
        await self.repository.remove_session(room_id, session_id)

    async def clear_session(self, session_id: UUID) -> None:
        await self.repository.clear_session(session_id)

    async def ping(self) -> bool:
        return await self.repository.ping()
