from fastapi import APIRouter

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok", "service": "aetheris-backend"}

