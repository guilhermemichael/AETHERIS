from fastapi.testclient import TestClient


def test_world_state_requires_token(client: TestClient) -> None:
    response = client.get("/api/v1/world/state")
    assert response.status_code == 401


def test_world_state_and_recompute_use_authenticated_session(client: TestClient) -> None:
    init_response = client.post(
        "/api/v1/sessions/init",
        json={
            "locale": "en-US",
            "device_class": "desktop",
            "render_mode": "webgl",
            "prefers_reduced_motion": False,
            "timezone_offset_minutes": -180,
        },
    )
    token = init_response.json()["access_token"]

    world_response = client.get(
        "/api/v1/world/state",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert world_response.status_code == 200
    assert world_response.json()["seed"]

    recompute_response = client.post(
        "/api/v1/world/recompute",
        headers={"Authorization": f"Bearer {token}"},
        json={"reason": "manual"},
    )
    assert recompute_response.status_code == 200
    assert recompute_response.json()["mode"] in {"void", "nebula", "crystal", "bloom", "archive"}
