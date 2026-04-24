# Infrastructure

## Local production spine

Use the root `docker-compose.yml` to boot the two runtime dependencies required by AETHERIS v1.5:

- `postgres` for durable sessions and world snapshots.
- `redis` for ephemeral presence, websocket heartbeat, and rate limiting.

```bash
cd C:\Users\guilh\PROJETOS\AETHERIS
docker compose up -d
```

Prometheus and Grafana remain a future extension; the backend already exposes `/api/v1/admin/metrics` for that next step.

