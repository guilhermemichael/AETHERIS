from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import admin, sessions, world
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.repositories.session_repo import SessionRepository
from app.services.seed_service import SeedService
from app.services.session_service import SessionService
from app.services.world_engine import WorldEngine

configure_logging()
settings = get_settings()

app = FastAPI(title=settings.app_name)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

repository = SessionRepository()
seed_service = SeedService()
world_engine = WorldEngine()
app.state.session_service = SessionService(
    settings=settings,
    repository=repository,
    seed_service=seed_service,
    world_engine=world_engine,
)

app.include_router(admin.router, prefix=settings.api_v1_prefix)
app.include_router(sessions.router, prefix=settings.api_v1_prefix)
app.include_router(world.router, prefix=settings.api_v1_prefix)

