from fastapi import APIRouter, Depends

from app.api.deps import get_current_session, get_session_service
from app.repositories.protocols import SessionRecord
from app.schemas.world import WorldRecomputeRequest, WorldStateSchema
from app.services.session_service import SessionService

router = APIRouter(prefix="/world", tags=["world"])


@router.get("/state", response_model=WorldStateSchema)
async def get_world_state(
    current_session: SessionRecord = Depends(get_current_session),
    session_service: SessionService = Depends(get_session_service),
) -> WorldStateSchema:
    return await session_service.get_world_state(current_session)


@router.post("/recompute", response_model=WorldStateSchema)
async def recompute_world(
    payload: WorldRecomputeRequest,
    current_session: SessionRecord = Depends(get_current_session),
    session_service: SessionService = Depends(get_session_service),
) -> WorldStateSchema:
    return await session_service.recompute_world(record=current_session, payload=payload)

