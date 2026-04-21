from datetime import UTC, datetime
from secrets import token_urlsafe
from uuid import uuid4

from app.core.config import Settings
from app.repositories.session_repo import SessionRecord, SessionRepository
from app.schemas.common import ConsentState, FeatureFlags, SeedEntropy
from app.schemas.session import (
    ConsentUpdateRequest,
    ConsentUpdateResponse,
    SessionInitRequest,
    SessionInitResponse,
)
from app.services.seed_service import SeedService
from app.services.world_engine import WorldEngine


class SessionService:
    def __init__(
        self,
        *,
        settings: Settings,
        repository: SessionRepository,
        seed_service: SeedService,
        world_engine: WorldEngine,
    ) -> None:
        self.settings = settings
        self.repository = repository
        self.seed_service = seed_service
        self.world_engine = world_engine

    def init_session(self, request: SessionInitRequest) -> SessionInitResponse:
        session_id = f"sess_{uuid4().hex[:12]}"
        entropy = SeedEntropy(
            session_id=session_id,
            locale=request.locale,
            device_class=request.device_class,
            prefers_reduced_motion=request.prefers_reduced_motion,
            wants_audio=request.wants_audio,
            wants_biometrics=request.wants_biometrics,
            time_bucket=datetime.now(UTC).strftime("%Y-%m-%dT%H"),
        )
        seed = self.seed_service.create_seed(entropy)
        consent = ConsentState(audio_reactive=request.wants_audio)
        world_state = self.world_engine.compute(seed=seed, request=request, consent=consent)
        record = SessionRecord(
            session_id=session_id,
            access_token=token_urlsafe(24),
            seed=seed,
            room_id=self.settings.default_room_id,
            request=request,
            consent=consent,
            feature_flags=self._feature_flags(request),
            world_state=world_state,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        self.repository.create(record)
        return SessionInitResponse(
            session_id=record.session_id,
            access_token=record.access_token,
            seed=record.seed,
            room_id=record.room_id,
            consent_required=self._consent_required(request),
            world_state=record.world_state,
            feature_flags=record.feature_flags,
        )

    def update_consent(self, request: ConsentUpdateRequest) -> ConsentUpdateResponse:
        record = self.repository.get(request.session_id)
        if record is None:
            raise KeyError(request.session_id)

        consent = ConsentState(
            mic=request.mic,
            camera=request.camera,
            local_biometrics=request.local_biometrics,
            presence_sync=request.presence_sync,
            audio_reactive=request.audio_reactive,
        )
        record.consent = consent
        record.world_state = self.world_engine.compute(
            seed=record.seed,
            request=record.request,
            consent=record.consent,
        )
        self.repository.update(record)
        return ConsentUpdateResponse(
            session_id=record.session_id,
            consent=record.consent,
            consent_required=self._consent_required(record.request),
            world_state=record.world_state,
            feature_flags=record.feature_flags,
        )

    def get_world_state(self, session_id: str | None = None):
        if session_id is None:
            request = SessionInitRequest(
                locale="en-US",
                device_class="desktop",
                prefers_reduced_motion=False,
                wants_audio=False,
                wants_biometrics=False,
            )
            consent = ConsentState(audio_reactive=False)
            return self.world_engine.compute(seed="0" * 64, request=request, consent=consent)

        record = self.repository.get(session_id)
        if record is None:
            raise KeyError(session_id)
        return record.world_state

    def _feature_flags(self, request: SessionInitRequest) -> FeatureFlags:
        return FeatureFlags(
            webgpu_preferred=True,
            reactive_audio=request.wants_audio,
            brush_reveal=True,
            social_presence=False,
            temporal_echoes=False,
        )

    def _consent_required(self, request: SessionInitRequest) -> list[str]:
        required: list[str] = []
        if request.wants_audio:
            required.append("audio_reactive")
        if request.wants_biometrics:
            required.extend(["mic", "local_biometrics"])
        return required

