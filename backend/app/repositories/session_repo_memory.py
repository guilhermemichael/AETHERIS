from datetime import UTC, datetime
from uuid import UUID

from app.repositories.protocols import SessionRecord, SessionRepositoryProtocol


class MemorySessionRepository(SessionRepositoryProtocol):
    def __init__(self) -> None:
        self._records: dict[UUID, SessionRecord] = {}

    async def create(self, record: SessionRecord) -> SessionRecord:
        self._records[record.session_id] = record
        return record

    async def get(self, session_id: UUID) -> SessionRecord | None:
        return self._records.get(session_id)

    async def update(self, record: SessionRecord) -> SessionRecord:
        record.updated_at = datetime.now(UTC)
        self._records[record.session_id] = record
        return record

    async def delete(self, session_id: UUID) -> None:
        self._records.pop(session_id, None)

    async def count_active(self, now: datetime) -> int:
        return sum(1 for record in self._records.values() if record.expires_at > now)

    async def ping(self) -> bool:
        return True
