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
