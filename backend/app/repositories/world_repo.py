from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.world_snapshot import WorldSnapshotModel
from app.repositories.protocols import WorldSnapshotRepositoryProtocol
from app.schemas.world import WorldStateSchema


class MemoryWorldSnapshotRepository(WorldSnapshotRepositoryProtocol):
    def __init__(self) -> None:
        self._snapshots: dict[UUID, WorldStateSchema] = {}

    async def save_snapshot(self, session_id: UUID, state: WorldStateSchema) -> WorldStateSchema:
        self._snapshots[session_id] = state
        return state

    async def get_latest(self, session_id: UUID) -> WorldStateSchema | None:
        return self._snapshots.get(session_id)

    async def delete_for_session(self, session_id: UUID) -> None:
        self._snapshots.pop(session_id, None)


class PostgresWorldSnapshotRepository(WorldSnapshotRepositoryProtocol):
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self.session_factory = session_factory

    async def save_snapshot(self, session_id: UUID, state: WorldStateSchema) -> WorldStateSchema:
        async with self.session_factory() as session:
            session.add(
                WorldSnapshotModel(
                    session_id=session_id,
                    state=state.model_dump(mode="json"),
                )
            )
            await session.commit()
        return state

    async def get_latest(self, session_id: UUID) -> WorldStateSchema | None:
        async with self.session_factory() as session:
            result = await session.execute(
                select(WorldSnapshotModel)
                .where(WorldSnapshotModel.session_id == session_id)
                .order_by(WorldSnapshotModel.created_at.desc())
                .limit(1)
            )
            model = result.scalar_one_or_none()
        if model is None:
            return None
        return WorldStateSchema.model_validate(model.state)

    async def delete_for_session(self, session_id: UUID) -> None:
        async with self.session_factory() as session:
            await session.execute(
                delete(WorldSnapshotModel).where(WorldSnapshotModel.session_id == session_id)
            )
            await session.commit()
