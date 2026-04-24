# AETHERIS Backend

FastAPI production spine for AETHERIS v1.5.

## Responsibilities

- Issues short-lived JWT-backed anonymous sessions.
- Persists sessions and world snapshots in Postgres.
- Tracks ephemeral presence and websocket heartbeat state in Redis.
- Exposes typed OpenAPI contracts for frontend generation.
- Publishes health, readiness, and Prometheus metrics endpoints.

## Local setup

```bash
cd C:\Users\guilh\PROJETOS\AETHERIS
docker compose up -d

cd backend
uv sync --dev
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

## Contract export

```bash
cd backend
uv run python scripts/export_openapi.py
```

