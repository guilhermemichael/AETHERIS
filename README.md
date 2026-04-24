# AETHERIS

AETHERIS is now on the `v1.5` milestone: immersive core plus a production spine. The project keeps the ritual onboarding and spatial interface, but now adds the foundations that make the system defensible as a product.

## What ships in v1.5

- FastAPI backend with short-lived JWT sessions.
- Postgres-ready durable session and world snapshot persistence.
- Redis-ready ephemeral presence, websocket heartbeat, and rate limiting.
- Typed OpenAPI export plus generated TypeScript contracts in `frontend/src/generated/api-types.ts`.
- WebSocket foundation with auth, room join, heartbeat, basic broadcast, and disconnect cleanup.
- Real camera and microphone permission flow from the consent CTA.
- Modular renderer boundary fed only by `worldState`, `localInput`, and `viewport`.
- Health, readiness, metrics, Docker Compose, stronger CI, and smoke coverage.

## Repository layout

```text
.
|-- backend/         FastAPI production spine
|-- frontend/        React immersive client
|-- docs/            API and architecture notes
|-- infrastructure/  Infra and observability notes
|-- docker-compose.yml
`-- .github/         CI and PR automation
```

## Local development

### 1. Infrastructure

```bash
cd C:\Users\guilh\PROJETOS\AETHERIS
docker compose up -d
```

### 2. Backend

```bash
cd backend
uv sync --dev
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

Environment defaults live in `backend/.env.example`.

### 3. Frontend

```bash
cd C:\Users\guilh\PROJETOS\AETHERIS
npm install
npm run dev --workspace frontend
```

The frontend defaults to `VITE_API_BASE_URL=http://127.0.0.1:8000`.

### 4. Run contracts sync

```bash
cd backend
uv run python scripts/export_openapi.py

cd ..
npm run generate:api-types
```

## Validation

### Backend

```bash
cd backend
uv run ruff check
uv run mypy
uv run pytest
```

### Frontend

```bash
cd C:\Users\guilh\PROJETOS\AETHERIS
npm run lint --workspace frontend
npm run typecheck --workspace frontend
npm run test --workspace frontend
npm run build --workspace frontend
npm run test:smoke --workspace frontend
```

## Current scope boundary

This repository intentionally does not implement full CRDT state, WebRTC mesh, complete temporal echoes, paid biomes, or heavy generative AI yet. Those remain later milestones so v1.5 can stay stable, testable, and demonstrable.
