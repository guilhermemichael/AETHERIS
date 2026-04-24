from collections.abc import Awaitable, Callable
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse, Response

from app.core.constants import DEFAULT_CSP, PERMISSIONS_POLICY, RATE_LIMIT_EXCLUDED_PATHS
from app.core.errors import RateLimitExceededError


def extract_bearer_token(authorization: str | None) -> str | None:
    if authorization is None:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None
    return token


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        response = await call_next(request)
        response.headers.setdefault("Content-Security-Policy", DEFAULT_CSP)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", PERMISSIONS_POLICY)
        return response


class RateLimiter:
    def __init__(
        self,
        *,
        redis_client: Any | None,
        window_seconds: int,
        max_requests: int,
    ) -> None:
        self.redis_client = redis_client
        self.window_seconds = window_seconds
        self.max_requests = max_requests
        self._memory_counters: dict[str, tuple[int, datetime]] = {}

    async def check(self, client_ip: str, route: str) -> None:
        key = f"rate_limit:{client_ip}:{route}"
        if self.redis_client is not None:
            current = await self.redis_client.incr(key)
            if current == 1:
                await self.redis_client.expire(key, self.window_seconds)
            if current > self.max_requests:
                raise RateLimitExceededError()
            return

        now = datetime.now(UTC)
        counter, expires_at = self._memory_counters.get(
            key, (0, now + timedelta(seconds=self.window_seconds))
        )
        if expires_at <= now:
            counter = 0
            expires_at = now + timedelta(seconds=self.window_seconds)
        counter += 1
        self._memory_counters[key] = (counter, expires_at)
        if counter > self.max_requests:
            raise RateLimitExceededError()


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        if request.url.path in RATE_LIMIT_EXCLUDED_PATHS:
            return await call_next(request)

        limiter: RateLimiter | None = getattr(request.app.state, "rate_limiter", None)
        if limiter is None:
            return await call_next(request)

        forwarded_for = request.headers.get("x-forwarded-for")
        client_ip = forwarded_for.split(",")[0].strip() if forwarded_for else request.client
        if isinstance(client_ip, str):
            ip_address = client_ip
        else:
            ip_address = client_ip.host if client_ip is not None else "unknown"

        try:
            await limiter.check(ip_address, request.url.path)
        except RateLimitExceededError as exc:
            return JSONResponse(
                status_code=exc.status_code,
                content={"code": exc.code, "detail": exc.detail},
            )
        return await call_next(request)
