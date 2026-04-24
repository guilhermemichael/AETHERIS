import logging
from datetime import UTC, datetime
from time import perf_counter
from uuid import UUID, uuid4

from app.core.config import Settings
from app.core.errors import SessionNotFoundError
from app.repositories.protocols import (
    SessionRecord,
    SessionRepositoryProtocol,
    WorldSnapshotRepositoryProtocol,
)
from app.schemas.common import ConsentState, FeatureFlags, SeedEntropy
from app.schemas.session import (
    ConsentUpdateRequest,
    ConsentUpdateResponse,
    SessionInitRequest,
    SessionInitResponse,
    SessionMeResponse,
)
from app.schemas.world import WorldRecomputeRequest, WorldStateSchema
from app.services.consent_service import ConsentService
from app.services.presence_service import PresenceService
from app.services.seed_service import SeedService
from app.services.telemetry_service import TelemetryService
from app.services.token_service import TokenService
from app.services.world_engine import WorldEngine


class SessionService:
    def __init__(
        self,
        *,
        settings: Settings,
        repository: SessionRepositoryProtocol,
        world_repository: WorldSnapshotRepositoryProtocol,
        seed_service: SeedService,
        consent_service: ConsentService,
        world_engine: WorldEngine,
        token_service: TokenService,
        presence_service: PresenceService,
        telemetry: TelemetryService,
    ) -> None:
        self.settings = settings
        self.repository = repository
        self.world_repository = world_repository
        self.seed_service = seed_service
        self.consent_service = consent_service
        self.world_engine = world_engine
        self.token_service = token_service
        self.presence_service = presence_service
        self.telemetry = telemetry
        self.logger = logging.getLogger("aetheris.session")

    async def init_session(self, request: SessionInitRequest) -> SessionInitResponse:
        started_at = perf_counter()
        session_id = uuid4()
        expires_at = self.token_service.expires_at()
        entropy = SeedEntropy(
            session_id=str(session_id),
            locale=request.locale,
            device_class=request.device_class,
            render_mode=request.render_mode,
            prefers_reduced_motion=request.prefers_reduced_motion,
            timezone_offset_minutes=request.timezone_offset_minutes,
            time_bucket=datetime.now(UTC).strftime("%Y-%m-%dT%H"),
        )
        seed = self.seed_service.create_seed(entropy)
        consent = ConsentState()
        record = SessionRecord(
            session_id=session_id,
            seed=seed,
            locale=request.locale,
            device_class=request.device_class,
            render_mode=request.render_mode,
            timezone_offset_minutes=request.timezone_offset_minutes,
            prefers_reduced_motion=request.prefers_reduced_motion,
            consent=consent,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
            expires_at=expires_at,
        )
        await self.repository.create(record)
        world_state = self.world_engine.compute(seed=seed, session=record, consent=consent)
        await self.world_repository.save_snapshot(record.session_id, world_state)
        access_token = self.token_service.issue_access_token(
            record.session_id,
            room_id=self.settings.default_room_id,
            expires_at=record.expires_at,
        )
        duration_ms = (perf_counter() - started_at) * 1000
        self.telemetry.record_session_init(duration_ms)
        self.telemetry.set_active_sessions(await self.repository.count_active(datetime.now(UTC)))
        self.logger.info(
            "session.init",
            extra={
                "event": "session.init",
                "session_id": str(record.session_id),
                "device_class": request.device_class,
                "render_mode": request.render_mode,
                "duration_ms": round(duration_ms, 3),
            },
        )
        return SessionInitResponse(
            session_id=record.session_id,
            access_token=access_token,
            expires_at=record.expires_at,
            consent=record.consent,
            feature_flags=self._feature_flags(record),
            world_state=world_state,
            room_id=self.settings.default_room_id,
        )

    async def get_session(self, session_id: UUID) -> SessionRecord:
        record = await self.repository.get(session_id)
        if record is None or record.expires_at <= datetime.now(UTC):
            raise SessionNotFoundError()
        return record

    async def get_session_state(self, record: SessionRecord) -> SessionMeResponse:
        world_state = await self.get_world_state(record)
        return SessionMeResponse(
            session_id=record.session_id,
            expires_at=record.expires_at,
            consent=record.consent,
            feature_flags=self._feature_flags(record),
            world_state=world_state,
            room_id=self.settings.default_room_id,
        )

    async def update_consent(
        self,
        *,
        record: SessionRecord,
        request: ConsentUpdateRequest,
    ) -> ConsentUpdateResponse:
        normalized_consent = self.consent_service.normalize(request.consent)
        record.consent = normalized_consent
        record.updated_at = datetime.now(UTC)
        await self.repository.update(record)
        world_state = await self.recompute_world(
            record=record,
            payload=WorldRecomputeRequest(reason="manual"),
        )
        return ConsentUpdateResponse(
            session_id=record.session_id,
            consent=normalized_consent,
            world_state=world_state,
        )

    async def get_world_state(self, record: SessionRecord) -> WorldStateSchema:
        snapshot = await self.world_repository.get_latest(record.session_id)
        if snapshot is not None:
            return snapshot
        return await self.recompute_world(record=record, payload=WorldRecomputeRequest())

    async def recompute_world(
        self,
        *,
        record: SessionRecord,
        payload: WorldRecomputeRequest,
    ) -> WorldStateSchema:
        started_at = perf_counter()
        presence_count = 1
        if record.consent.presence:
            room_state = await self.presence_service.list_room(self.settings.default_room_id)
            presence_count = max(1, len(room_state))
        world_state = self.world_engine.compute(
            seed=record.seed,
            session=record,
            consent=record.consent,
            presence_count=presence_count,
        )
        await self.world_repository.save_snapshot(record.session_id, world_state)
        duration_ms = (perf_counter() - started_at) * 1000
        self.telemetry.record_world_compute(duration_ms)
        self.logger.info(
            "world.recompute",
            extra={
                "event": "world.recompute",
                "session_id": str(record.session_id),
                "reason": payload.reason,
                "duration_ms": round(duration_ms, 3),
            },
        )
        return world_state

    async def delete_session(self, record: SessionRecord) -> None:
        await self.presence_service.clear_session(record.session_id)
        await self.world_repository.delete_for_session(record.session_id)
        await self.repository.delete(record.session_id)
        self.telemetry.set_active_sessions(await self.repository.count_active(datetime.now(UTC)))
        self.logger.info(
            "session.delete",
            extra={
                "event": "session.delete",
                "session_id": str(record.session_id),
            },
        )

    def _feature_flags(self, record: SessionRecord) -> FeatureFlags:
        return FeatureFlags(
            webgpu_enabled=record.render_mode == "webgpu",
            webgl_fallback_enabled=True,
            local_biometrics_enabled=True,
            audio_reactive_enabled=True,
            websocket_enabled=True,
            echoes_enabled=False,
        )

