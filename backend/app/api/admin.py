from fastapi import APIRouter, Request, Response, status
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/health")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok", "service": "aetheris-backend"}


@router.get("/readiness")
async def readiness(request: Request) -> JSONResponse:
    postgres = request.app.state.postgres
    redis = request.app.state.redis

    postgres_ok = False
    redis_ok = False

    if postgres is not None:
        try:
            postgres_ok = await postgres.ping()
        except Exception:
            postgres_ok = False

    if redis is not None:
        try:
            redis_ok = await redis.ping()
        except Exception:
            redis_ok = False

    payload = {
        "status": "ready" if postgres_ok and redis_ok else "degraded",
        "components": {
            "postgres": postgres_ok,
            "redis": redis_ok,
        },
        "backends": request.app.state.runtime,
    }
    return JSONResponse(
        status_code=(
            status.HTTP_200_OK
            if postgres_ok and redis_ok
            else status.HTTP_503_SERVICE_UNAVAILABLE
        ),
        content=payload,
    )


@router.get("/metrics")
async def metrics(request: Request) -> Response:
    telemetry = request.app.state.telemetry
    return Response(content=telemetry.render(), media_type=telemetry.content_type)

