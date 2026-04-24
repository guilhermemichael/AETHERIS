from prometheus_client import CONTENT_TYPE_LATEST, CollectorRegistry, Counter, Gauge, Histogram
from prometheus_client import generate_latest


class TelemetryService:
    def __init__(self) -> None:
        self.registry = CollectorRegistry(auto_describe=True)
        self.sessions_total = Counter(
            "aetheris_sessions_total",
            "Total initialized sessions",
            registry=self.registry,
        )
        self.active_sessions = Gauge(
            "aetheris_active_sessions",
            "Active sessions currently registered",
            registry=self.registry,
        )
        self.world_compute_ms = Histogram(
            "aetheris_world_compute_ms",
            "World compute duration in milliseconds",
            registry=self.registry,
            buckets=(1, 5, 10, 25, 50, 100, 250, 500, 1000),
        )
        self.ws_connections = Gauge(
            "aetheris_ws_connections",
            "Active websocket connections",
            registry=self.registry,
        )
        self.errors_total = Counter(
            "aetheris_errors_total",
            "Total backend errors",
            ["event"],
            registry=self.registry,
        )

    def record_session_init(self, duration_ms: float) -> None:
        self.sessions_total.inc()
        self.world_compute_ms.observe(duration_ms)

    def set_active_sessions(self, value: int) -> None:
        self.active_sessions.set(value)

    def record_world_compute(self, duration_ms: float) -> None:
        self.world_compute_ms.observe(duration_ms)

    def ws_opened(self) -> None:
        self.ws_connections.inc()

    def ws_closed(self) -> None:
        self.ws_connections.dec()

    def record_error(self, event: str) -> None:
        self.errors_total.labels(event=event).inc()

    def render(self) -> bytes:
        return generate_latest(self.registry)

    @property
    def content_type(self) -> str:
        return CONTENT_TYPE_LATEST
