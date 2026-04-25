# AETHERIS

AETHERIS is now on the `v1.5` milestone: immersive core plus a production spine. The project keeps the ritual onboarding and spatial interface, but now adds the foundations that make the system defensible as a product.

## What ships in v1.5

- FastAPI backend with short-lived JWT sessions.
- Postgres-ready durable session and world snapshot persistence.
- Redis-ready ephemeral presence, websocket heartbeat, and rate limiting.
- Typed OpenAPI export plus generated TypeScript contracts in `frontend/src/generated/api-types.ts`.
- WebSocket foundation with auth, room join, heartbeat, basic broadcast, and disconnect cleanup.
- Real camera and microphone permission flow from the consent CTA.
- Ritual-safe fallback when session bootstrap, consent sync, or renderer startup degrade locally.
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

### Quick start

```bash
cd C:\Users\guilh\PROJETOS\AETHERIS
docker compose up -d

cd backend
uv sync --dev
uv run alembic upgrade head

cd ..
npm install
npm run dev
```

`npm run dev` from the repository root starts the FastAPI backend and the Vite frontend together. Docker Compose keeps Postgres and Redis available for the production-shaped local flow.

Local URLs after boot:

- Frontend: `http://127.0.0.1:5173`
- Backend docs: `http://127.0.0.1:8000/docs`
- Healthcheck: `http://127.0.0.1:8000/api/v1/admin/health`

### 1. Infrastructure

```bash
cd C:\Users\guilh\PROJETOS\AETHERIS
docker compose up -d
```

### 2. Backend setup

```bash
cd backend
uv sync --dev
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

Environment defaults live in `backend/.env.example`. Copy them to `backend/.env` when you need an explicit local override.

### 3. Frontend setup

```bash
cd C:\Users\guilh\PROJETOS\AETHERIS
npm install
npm run dev --workspace frontend
```

The frontend defaults to `VITE_API_BASE_URL=http://127.0.0.1:8000`.

### 4. Resilience notes

- If the backend session bootstrap fails, the frontend continues in a ritual-safe local mode instead of trapping the user in the consent flow.
- If consent sync or realtime presence fail, the world still opens and surfaces a degraded-mode notice.
- If WebGPU or WebGL renderer creation fails, the viewport falls back to the static ritual shell.

### 5. Run contracts sync

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
