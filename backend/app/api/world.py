from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_session_service
from app.schemas.world import WorldStateSchema
from app.services.session_service import SessionService

router = APIRouter(prefix="/world", tags=["world"])


@router.get("/state", response_model=WorldStateSchema)
def get_world_state(
    session_id: str | None = Query(default=None),
    session_service: SessionService = Depends(get_session_service),
) -> WorldStateSchema:
    try:
        return session_service.get_world_state(session_id)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found") from exc

