from datetime import datetime
from typing import cast
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.session import SessionModel
from app.repositories.protocols import SessionRecord, SessionRepositoryProtocol
from app.schemas.common import ConsentState, DeviceClass, RenderMode


class PostgresSessionRepository(SessionRepositoryProtocol):
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self.session_factory = session_factory

    async def create(self, record: SessionRecord) -> SessionRecord:
        async with self.session_factory() as session:
            session.add(
                SessionModel(
                    id=record.session_id,
                    seed=record.seed,
                    locale=record.locale,
                    device_class=record.device_class,
                    render_mode=record.render_mode,
                    timezone_offset_minutes=record.timezone_offset_minutes,
                    prefers_reduced_motion=record.prefers_reduced_motion,
                    consent=record.consent.model_dump(),
                    created_at=record.created_at,
                    updated_at=record.updated_at,
                    expires_at=record.expires_at,
                )
            )
            await session.commit()
        return record

    async def get(self, session_id: UUID) -> SessionRecord | None:
        async with self.session_factory() as session:
            model = await session.get(SessionModel, session_id)
        return None if model is None else _to_record(model)

    async def update(self, record: SessionRecord) -> SessionRecord:
        async with self.session_factory() as session:
            model = await session.get(SessionModel, record.session_id)
            if model is None:
                return record
            model.consent = record.consent.model_dump()
            model.updated_at = record.updated_at
            await session.commit()
        return record

    async def delete(self, session_id: UUID) -> None:
        async with self.session_factory() as session:
            await session.execute(delete(SessionModel).where(SessionModel.id == session_id))
            await session.commit()

    async def count_active(self, now: datetime) -> int:
        async with self.session_factory() as session:
            result = await session.execute(
                select(func.count()).select_from(SessionModel).where(SessionModel.expires_at > now)
            )
        return int(result.scalar_one())

    async def ping(self) -> bool:
        async with self.session_factory() as session:
            await session.execute(select(1))
        return True


def _to_record(model: SessionModel) -> SessionRecord:
    return SessionRecord(
        session_id=model.id,
        seed=model.seed,
        locale=model.locale,
        device_class=cast(DeviceClass, model.device_class),
        render_mode=cast(RenderMode, model.render_mode),
        timezone_offset_minutes=model.timezone_offset_minutes,
        prefers_reduced_motion=model.prefers_reduced_motion,
        consent=ConsentState.model_validate(model.consent),
        created_at=model.created_at,
        updated_at=model.updated_at,
        expires_at=model.expires_at,
    )
