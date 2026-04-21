# AETHERIS API v1

## `GET /api/v1/admin/health`

Returns backend liveness.

## `POST /api/v1/sessions/init`

Creates an anonymous session and returns:

- `session_id`
- `access_token`
- `seed`
- `room_id`
- `consent_required`
- `world_state`
- `feature_flags`

## `POST /api/v1/sessions/consent`

Accepts a session id plus consent booleans for microphone, biometrics proxy, presence sync, and audio reactivity. Returns the updated consent snapshot and recomputed `world_state`.

## `GET /api/v1/world/state`

Returns a baseline world state when no `session_id` is supplied, or the active session world state when it is.

