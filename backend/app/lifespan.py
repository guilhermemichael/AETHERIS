from collections.abc import AsyncIterator, Callable
from contextlib import AbstractAsyncContextManager, asynccontextmanager

from fastapi import FastAPI

from app.core.config import Settings
from app.core.security import RateLimiter
from app.db.postgres import PostgresDatabase
from app.db.redis import RedisDatabase
from app.repositories.presence_repo_memory import MemoryPresenceRepository
from app.repositories.presence_repo_redis import RedisPresenceRepository
from app.repositories.protocols import (
    PresenceRepositoryProtocol,
    SessionRepositoryProtocol,
    WorldSnapshotRepositoryProtocol,
)
from app.repositories.session_repo_memory import MemorySessionRepository
from app.repositories.session_repo_postgres import PostgresSessionRepository
from app.repositories.world_repo import MemoryWorldSnapshotRepository, PostgresWorldSnapshotRepository
from app.services.consent_service import ConsentService
from app.services.presence_service import PresenceService
from app.services.seed_service import SeedService
from app.services.session_service import SessionService
from app.services.telemetry_service import TelemetryService
from app.services.token_service import TokenService
from app.services.world_engine import WorldEngine
from app.websocket.manager import WebSocketManager


def create_lifespan(settings: Settings) -> Callable[[FastAPI], AbstractAsyncContextManager[None]]:
    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        telemetry = TelemetryService()
        postgres = PostgresDatabase(settings.database_url) if settings.database_url else None
        redis = RedisDatabase(settings.redis_url) if settings.redis_url else None

        session_backend = settings.session_repository_backend
        if session_backend == "auto":
            session_backend = "postgres" if postgres is not None else "memory"

        presence_backend = settings.presence_repository_backend
        if presence_backend == "auto":
            presence_backend = "redis" if redis is not None else "memory"

        if session_backend == "postgres" and postgres is not None:
            session_repository: SessionRepositoryProtocol = PostgresSessionRepository(
                postgres.session_factory
            )
            world_repository: WorldSnapshotRepositoryProtocol = PostgresWorldSnapshotRepository(
                postgres.session_factory
            )
        else:
            session_repository = MemorySessionRepository()
            world_repository = MemoryWorldSnapshotRepository()

        if presence_backend == "redis" and redis is not None:
            presence_repository: PresenceRepositoryProtocol = RedisPresenceRepository(
                redis.client,
                presence_ttl_seconds=settings.presence_ttl_seconds,
                heartbeat_ttl_seconds=settings.heartbeat_ttl_seconds,
            )
        else:
            presence_repository = MemoryPresenceRepository()

        presence_service = PresenceService(presence_repository)
        token_service = TokenService(settings)
        session_service = SessionService(
            settings=settings,
            repository=session_repository,
            world_repository=world_repository,
            seed_service=SeedService(),
            consent_service=ConsentService(),
            world_engine=WorldEngine(),
            token_service=token_service,
            presence_service=presence_service,
            telemetry=telemetry,
        )

        app.state.settings = settings
        app.state.telemetry = telemetry
        app.state.postgres = postgres
        app.state.redis = redis
        app.state.session_service = session_service
        app.state.presence_service = presence_service
        app.state.token_service = token_service
        app.state.ws_manager = WebSocketManager(telemetry)
        app.state.rate_limiter = RateLimiter(
            redis_client=None if redis is None else redis.client,
            window_seconds=settings.rate_limit_window_seconds,
            max_requests=settings.rate_limit_requests,
        )
        app.state.runtime = {
            "session_backend": session_backend,
            "presence_backend": presence_backend,
        }
        yield
        if redis is not None:
            await redis.close()
        if postgres is not None:
            await postgres.dispose()

    return lifespan
