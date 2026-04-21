# AETHERIS Architecture

## System boundaries

- Backend owns session identity, seed generation, and typed world-state composition.
- Frontend owns user interface state, local derived input, and content discovery.
- Renderer consumes only `WorldState` plus `LocalInputSnapshot`.

## v1 execution model

1. Frontend initializes an anonymous session through `POST /api/v1/sessions/init`.
2. Backend issues a deterministic session seed and a baseline ritual world state.
3. Frontend presents granular consent controls and keeps all raw sensory media local.
4. Consent updates are sent as booleans through `POST /api/v1/sessions/consent`.
5. Backend recomputes the world state and the renderer blooms into the main experience.

## Why the split matters

- Visual effect can evolve independently of product content.
- Product content stays typed and testable instead of being trapped inside animation code.
- Future Redis/Postgres/WebSocket layers can be introduced behind current service and repository seams.

