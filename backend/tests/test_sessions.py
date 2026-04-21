from fastapi.testclient import TestClient

from app.main import app


def test_session_init_returns_typed_world_state() -> None:
    client = TestClient(app)

    response = client.post(
        "/api/v1/sessions/init",
        json={
            "locale": "en-US",
            "device_class": "desktop",
            "prefers_reduced_motion": False,
            "wants_audio": True,
            "wants_biometrics": True,
        },
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["session_id"].startswith("sess_")
    assert payload["feature_flags"]["webgpu_preferred"] is True
    assert 0 <= payload["world_state"]["fog_density"] <= 1
    assert "mic" in payload["consent_required"]


def test_consent_update_changes_world_mode() -> None:
    client = TestClient(app)
    init_response = client.post(
        "/api/v1/sessions/init",
        json={
            "locale": "en-US",
            "device_class": "desktop",
            "prefers_reduced_motion": False,
            "wants_audio": True,
            "wants_biometrics": True,
        },
    )
    session_id = init_response.json()["session_id"]

    response = client.post(
        "/api/v1/sessions/consent",
        json={
            "session_id": session_id,
            "mic": True,
            "camera": False,
            "local_biometrics": True,
            "presence_sync": True,
            "audio_reactive": True,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["consent"]["local_biometrics"] is True
    assert payload["world_state"]["mode"] == "somatic_bloom"


def test_invalid_session_returns_not_found() -> None:
    client = TestClient(app)

    response = client.post(
        "/api/v1/sessions/consent",
        json={
            "session_id": "sess_missing",
            "mic": False,
            "camera": False,
            "local_biometrics": False,
            "presence_sync": True,
            "audio_reactive": True,
        },
    )

    assert response.status_code == 404


def test_invalid_payload_is_rejected() -> None:
    client = TestClient(app)

    response = client.post(
        "/api/v1/sessions/init",
        json={
            "locale": "",
            "device_class": "desktop",
            "prefers_reduced_motion": False,
            "wants_audio": True,
            "wants_biometrics": False,
        },
    )

    assert response.status_code == 422

