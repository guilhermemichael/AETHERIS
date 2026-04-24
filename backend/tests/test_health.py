from fastapi.testclient import TestClient


def test_healthcheck(client: TestClient) -> None:
    response = client.get("/api/v1/admin/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_readiness_reports_degraded_without_infra(client: TestClient) -> None:
    response = client.get("/api/v1/admin/readiness")

    payload = response.json()
    postgres_ok = payload["components"]["postgres"]
    redis_ok = payload["components"]["redis"]

    assert response.status_code in {200, 503}
    if postgres_ok and redis_ok:
        assert response.status_code == 200
        assert payload["status"] == "ready"
    else:
        assert response.status_code == 503
        assert payload["status"] == "degraded"


def test_metrics_returns_prometheus_content_type(client: TestClient) -> None:
    response = client.get("/api/v1/admin/metrics")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/plain")


def test_invalid_host_keeps_cors_and_security_headers(client: TestClient) -> None:
    response = client.get(
        "/api/v1/admin/health",
        headers={
            "host": "evil.example",
            "origin": "http://localhost:5173",
        },
    )

    assert response.status_code == 400
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "Content-Security-Policy" in response.headers
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
    assert "Permissions-Policy" in response.headers
