from fastapi.testclient import TestClient


def test_websocket_accepts_authenticated_session_and_handles_ping(client: TestClient) -> None:
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

    with client.websocket_connect(f"/api/v1/ws?token={token}") as websocket:
        accepted = websocket.receive_json()
        assert accepted["type"] == "session.accepted"

        websocket.send_json({"type": "session.join", "payload": {}, "ts": 1})
        joined = websocket.receive_json()
        assert joined["type"] == "presence.snapshot"

        websocket.send_json({"type": "ping", "payload": {}, "ts": 2})
        pong = websocket.receive_json()
        assert pong["type"] == "pong"
