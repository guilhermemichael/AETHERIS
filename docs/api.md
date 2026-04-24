# AETHERIS API v1.5

## Admin

- `GET /api/v1/admin/health`
  Liveness probe for process health.
- `GET /api/v1/admin/readiness`
  Readiness probe for Postgres and Redis availability.
- `GET /api/v1/admin/metrics`
  Prometheus metrics endpoint.

## Sessions

- `POST /api/v1/sessions/init`
  Public bootstrap route. Returns `session_id`, `access_token`, `expires_at`, `consent`, `feature_flags`, `world_state`, and `room_id`.
- `GET /api/v1/sessions/me`
  Requires `Authorization: Bearer <token>`.
- `POST /api/v1/sessions/consent`
  Requires `Authorization: Bearer <token>`. Accepts the typed `ConsentState` payload and recomputes the world.
- `DELETE /api/v1/sessions/me`
  Requires `Authorization: Bearer <token>`. Invalidates the session immediately.

## World

- `GET /api/v1/world/state`
  Requires `Authorization: Bearer <token>`. Returns the latest world snapshot for the authenticated session.
- `POST /api/v1/world/recompute`
  Requires `Authorization: Bearer <token>`. Recomputes and stores a new world snapshot.

## WebSocket

- `WS /api/v1/ws?token=<jwt>`
  Authenticated websocket foundation for `session.join`, `presence.update`, `local.input`, `world.interact`, and `ping`.

Server events currently shipped:

- `session.accepted`
- `presence.snapshot`
- `presence.left`
- `world.patch`
- `pong`
- `error`

