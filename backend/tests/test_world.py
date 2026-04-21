from fastapi.testclient import TestClient

from app.main import app


def test_world_state_returns_baseline_without_session() -> None:
    client = TestClient(app)

    response = client.get("/api/v1/world/state")

    assert response.status_code == 200
    payload = response.json()
    assert payload["particle_count"] >= 0
    assert len(payload["palette"]) == 4

