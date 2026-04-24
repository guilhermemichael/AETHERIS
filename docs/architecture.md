# AETHERIS Architecture

## v1.5 production spine

- Backend owns identity, deterministic seed generation, JWT validation, world composition, OpenAPI contracts, metrics, and websocket session enforcement.
- Frontend owns consent UX, local-only camera/microphone handling, local input sampling, renderer orchestration, and content discovery.
- Renderer consumes only `RenderInput`, which contains `worldState`, `localInput`, and `viewport`.

## Runtime boundaries

1. User reaches the void and the pulse node appears.
2. Consent UI is shown before any media request is attempted.
3. Camera and microphone requests happen only inside the CTA click handler.
4. Backend session initialization happens after the permission handshake.
5. Consent is posted with the authenticated bearer token.
6. The renderer boots from typed world state and local input only.
7. WebSocket joins the default room and keeps heartbeat/presence state alive.

## Persistence split

- `Postgres` stores durable `sessions` and `world_snapshots`.
- `Redis` stores ephemeral presence, room membership, websocket heartbeat, and rate-limit counters.
- Repositories keep memory fallbacks for local testability, while CI and compose can exercise the real backends.

