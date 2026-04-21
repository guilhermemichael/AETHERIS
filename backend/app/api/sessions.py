from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_session_service
from app.schemas.session import (
    ConsentUpdateRequest,
    ConsentUpdateResponse,
    SessionInitRequest,
    SessionInitResponse,
)
from app.services.session_service import SessionService

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("/init", response_model=SessionInitResponse, status_code=status.HTTP_201_CREATED)
def init_session(
    payload: SessionInitRequest,
    session_service: SessionService = Depends(get_session_service),
) -> SessionInitResponse:
    return session_service.init_session(payload)


@router.post("/consent", response_model=ConsentUpdateResponse)
def update_consent(
    payload: ConsentUpdateRequest,
    session_service: SessionService = Depends(get_session_service),
) -> ConsentUpdateResponse:
    try:
        return session_service.update_consent(payload)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found") from exc

