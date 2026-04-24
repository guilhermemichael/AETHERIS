from fastapi import APIRouter, Depends, Response, status

from app.api.deps import get_current_session, get_session_service
from app.repositories.protocols import SessionRecord
from app.schemas.session import (
    ConsentUpdateRequest,
    ConsentUpdateResponse,
    SessionInitRequest,
    SessionInitResponse,
    SessionMeResponse,
)
from app.services.session_service import SessionService

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("/init", response_model=SessionInitResponse, status_code=status.HTTP_201_CREATED)
async def init_session(
    payload: SessionInitRequest,
    session_service: SessionService = Depends(get_session_service),
) -> SessionInitResponse:
    return await session_service.init_session(payload)


@router.post("/consent", response_model=ConsentUpdateResponse)
async def update_consent(
    payload: ConsentUpdateRequest,
    current_session: SessionRecord = Depends(get_current_session),
    session_service: SessionService = Depends(get_session_service),
) -> ConsentUpdateResponse:
    return await session_service.update_consent(record=current_session, request=payload)


@router.get("/me", response_model=SessionMeResponse)
async def get_session_me(
    current_session: SessionRecord = Depends(get_current_session),
    session_service: SessionService = Depends(get_session_service),
) -> SessionMeResponse:
    return await session_service.get_session_state(current_session)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session_me(
    current_session: SessionRecord = Depends(get_current_session),
    session_service: SessionService = Depends(get_session_service),
) -> Response:
    await session_service.delete_session(current_session)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

