# AETHERIS

AETHERIS is an immersive portfolio ecosystem that turns presence signals into a living digital biosphere. Python decides the world state, the browser interprets local intent, and the renderer translates that state into a ritualized spatial interface.

## What ships in v1

- FastAPI session kernel with typed world-state contracts.
- WebGPU-first React frontend with graceful WebGL and static fallbacks.
- Privacy-first local input interpretation for microphone, cursor, focus, and motion timing.
- Ritual onboarding flow: void -> pulse -> consent -> seed -> bloom.
- Typed content manifest for `About`, `Work`, and `Contact`.
- GitHub Actions CI, PR template, docs, and a repository structure ready for Redis/Postgres/WebSocket expansion.

## Product principles

- AETHERIS is not a decorative landing page; it is an environment.
- Raw camera frames and raw microphone audio never leave the browser.
- The backend receives only anonymous, derived state and decides visual composition.
- Rendering, system state, and product content remain separate concerns.

## Architecture

- `backend/` is the session kernel. It generates deterministic seeds, evaluates consent, and composes typed `WorldState` responses through FastAPI services and in-memory repositories that are ready to be swapped for Redis/Postgres later.
- `frontend/` is the biosphere client. Zustand stores keep session state, world state, and interface state separate from rendering.
- `frontend/src/render/` is a thin renderer boundary. It consumes only typed `WorldState` plus local derived inputs and resolves rendering as `WebGPU -> WebGL2 -> static`.
- `frontend/src/content/` holds product meaning as typed content nodes so the portfolio can evolve without entangling narrative content with shaders or simulation code.

## Ritual flow

1. The user arrives in the void and receives a single pulse node.
2. The frontend initializes an anonymous session and receives a deterministic seed plus baseline world state.
3. A granular consent panel offers audio reactivity, microphone presence, and local biometrics proxy without sending raw media to the backend.
4. Consent updates recompute world state on the backend.
5. The renderer blooms into the main environment, where `About`, `Work`, and `Contact` emerge as discoverable nodes instead of traditional navigation.

## Repository layout

```text
.
├── backend/         FastAPI session kernel and world engine
├── frontend/        React + Three.js ritual client
├── docs/            Architecture and implementation notes
├── infrastructure/  Reserved for deployment and observability assets
└── .github/         CI and pull request hygiene
```

## Local development

### Backend

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload
```

API base URL: `http://127.0.0.1:8000`

### Frontend

```bash
npm install
npm run dev --workspace frontend
```

The frontend expects `VITE_API_BASE_URL=http://127.0.0.1:8000` by default.

## Testing

### Backend

```bash
cd backend
uv run pytest
```

### Frontend

```bash
npm run test --workspace frontend
npm run build --workspace frontend
```

Optional browser smoke tests:

```bash
npx playwright install chromium
npm run test:smoke --workspace frontend
```

## Git and GitHub workflow

- Local repository is initialized on `main`.
- `origin` points to `https://github.com/guilhermemichael/AETHERIS.git`.
- Use short-lived branches such as `feat/session-kernel` or `feat/world-bloom`.
- Keep `README.md` and `docs/` updated whenever public behavior, setup, architecture, or roadmap changes.
- Let GitHub Actions validate backend tests and frontend build/test on every push and pull request.

## Privacy model

- Consent is explicit and granular.
- Microphone access is optional and only used for local feature extraction.
- If permission is denied, AETHERIS degrades gracefully to interaction-only mode.
- No therapeutic or emotion-diagnosis claims are made; the system adapts aesthetics, not psychology.

## API and contract notes

- Public API endpoints are documented in `docs/api.md`.
- Frontend request/response types mirror the backend session and world schemas.
- No raw camera or microphone payload is modeled in backend contracts; only consent booleans and derived visual state cross the network boundary.

## Roadmap beyond v1

- Real-time social presence over WebSocket rooms.
- Temporal echoes and encrypted memory blossoms.
- Redis/Postgres persistence and observability dashboards.
- Brand biomes and premium export flows.
