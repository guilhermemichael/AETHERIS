from fastapi.testclient import TestClient


def test_session_init_and_me_roundtrip(client: TestClient) -> None:
    response = client.post(
        "/api/v1/sessions/init",
        json={
            "locale": "en-US",
            "device_class": "desktop",
            "render_mode": "webgpu",
            "prefers_reduced_motion": False,
            "timezone_offset_minutes": -180,
        },
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["feature_flags"]["websocket_enabled"] is True
    assert payload["world_state"]["seed"]

    me_response = client.get(
        "/api/v1/sessions/me",
        headers={"Authorization": f"Bearer {payload['access_token']}"},
    )

    assert me_response.status_code == 200
    me_payload = me_response.json()
    assert me_payload["session_id"] == payload["session_id"]
    assert me_payload["room_id"] == "room_void_01"


def test_consent_update_changes_world_mode(client: TestClient) -> None:
    init_response = client.post(
        "/api/v1/sessions/init",
        json={
            "locale": "en-US",
            "device_class": "desktop",
            "render_mode": "webgpu",
            "prefers_reduced_motion": False,
            "timezone_offset_minutes": -180,
        },
    )
    token = init_response.json()["access_token"]

    response = client.post(
        "/api/v1/sessions/consent",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "consent": {
                "microphone": True,
                "camera": False,
                "local_biometrics": True,
                "audio": True,
                "presence": True,
            }
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["consent"]["local_biometrics"] is True
    assert payload["world_state"]["mode"] == "bloom"


def test_delete_session_invalidates_token(client: TestClient) -> None:
    init_response = client.post(
        "/api/v1/sessions/init",
        json={
            "locale": "en-US",
            "device_class": "desktop",
            "render_mode": "webgpu",
            "prefers_reduced_motion": False,
            "timezone_offset_minutes": -180,
        },
    )
    token = init_response.json()["access_token"]

    delete_response = client.delete(
        "/api/v1/sessions/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert delete_response.status_code == 204

    me_response = client.get(
        "/api/v1/sessions/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_response.status_code == 404
