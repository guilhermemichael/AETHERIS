DEFAULT_ROOM_ID = "room_void_01"
DEFAULT_TRUSTED_HOSTS = ["127.0.0.1", "localhost", "testserver"]
DEFAULT_CORS_ORIGINS = ["http://127.0.0.1:5173", "http://localhost:5173"]
DEFAULT_CSP = (
    "default-src 'self'; "
    "img-src 'self' data: blob:; "
    "media-src 'self' blob:; "
    "style-src 'self' 'unsafe-inline'; "
    "script-src 'self'; "
    "connect-src 'self' http://127.0.0.1:8000 http://localhost:8000 "
    "ws://127.0.0.1:8000 ws://localhost:8000"
)
PERMISSIONS_POLICY = "camera=(self), microphone=(self)"
RATE_LIMIT_EXCLUDED_PATHS = frozenset(
    {
        "/api/v1/admin/health",
        "/api/v1/admin/readiness",
        "/api/v1/admin/metrics",
    }
)
