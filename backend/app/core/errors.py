from typing import Any, cast

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class AetherisError(Exception):
    status_code = 400
    code = "aetheris_error"
    detail = "AETHERIS request failed"

    def __init__(self, detail: str | None = None) -> None:
        super().__init__(detail or self.detail)
        self.detail = detail or self.detail


class AuthenticationError(AetherisError):
    status_code = 401
    code = "authentication_error"
    detail = "Authentication failed"


class SessionNotFoundError(AetherisError):
    status_code = 404
    code = "session_not_found"
    detail = "Session not found"


class RateLimitExceededError(AetherisError):
    status_code = 429
    code = "rate_limit_exceeded"
    detail = "Too many requests"


def install_exception_handlers(app: FastAPI) -> None:
    async def handle_known_error(request: Request, exc: AetherisError) -> JSONResponse:
        telemetry = getattr(request.app.state, "telemetry", None)
        if telemetry is not None:
            telemetry.record_error(exc.code)
        return JSONResponse(
            status_code=exc.status_code,
            content={"code": exc.code, "detail": exc.detail},
        )

    async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
        telemetry = getattr(request.app.state, "telemetry", None)
        if telemetry is not None:
            telemetry.record_error("internal_server_error")
        return JSONResponse(
            status_code=500,
            content={"code": "internal_server_error", "detail": "Internal server error"},
        )

    app.add_exception_handler(AetherisError, cast(Any, handle_known_error))
    app.add_exception_handler(Exception, handle_unexpected_error)
