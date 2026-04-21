from dataclasses import dataclass
from datetime import UTC, datetime

from app.schemas.common import ConsentState, FeatureFlags
from app.schemas.session import SessionInitRequest
from app.schemas.world import WorldStateSchema


@dataclass
class SessionRecord:
    session_id: str
    access_token: str
    seed: str
    room_id: str
    request: SessionInitRequest
    consent: ConsentState
    feature_flags: FeatureFlags
    world_state: WorldStateSchema
    created_at: datetime
    updated_at: datetime


class SessionRepository:
    def __init__(self) -> None:
        self._sessions: dict[str, SessionRecord] = {}

    def create(self, record: SessionRecord) -> SessionRecord:
        self._sessions[record.session_id] = record
        return record

    def get(self, session_id: str) -> SessionRecord | None:
        return self._sessions.get(session_id)

    def update(self, record: SessionRecord) -> SessionRecord:
        record.updated_at = datetime.now(UTC)
        self._sessions[record.session_id] = record
        return record

