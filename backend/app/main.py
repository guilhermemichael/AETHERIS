from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.api import admin, sessions, world, ws
from app.core.config import get_settings
from app.core.errors import install_exception_handlers
from app.core.logging import configure_logging
from app.core.security import RateLimitMiddleware, SecurityHeadersMiddleware
from app.lifespan import create_lifespan


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings.log_level)
    app = FastAPI(title=settings.app_name, lifespan=create_lifespan(settings))
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_hosts)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RateLimitMiddleware)
    install_exception_handlers(app)

    app.include_router(admin.router, prefix=settings.api_v1_prefix)
    app.include_router(sessions.router, prefix=settings.api_v1_prefix)
    app.include_router(world.router, prefix=settings.api_v1_prefix)
    app.include_router(ws.router, prefix=settings.api_v1_prefix)
    return app


app = create_app()

