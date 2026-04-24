from typing import Annotated, cast

from fastapi import Header, Request

from app.core.errors import AuthenticationError
from app.core.security import extract_bearer_token
from app.repositories.protocols import SessionRecord
from app.services.presence_service import PresenceService
from app.services.session_service import SessionService
from app.services.token_service import TokenService
from app.websocket.manager import WebSocketManager


def get_session_service(request: Request) -> SessionService:
    return cast(SessionService, request.app.state.session_service)


def get_presence_service(request: Request) -> PresenceService:
    return cast(PresenceService, request.app.state.presence_service)


def get_token_service(request: Request) -> TokenService:
    return cast(TokenService, request.app.state.token_service)


def get_ws_manager(request: Request) -> WebSocketManager:
    return cast(WebSocketManager, request.app.state.ws_manager)


async def get_current_session(
    request: Request,
    authorization: Annotated[str | None, Header()] = None,
) -> SessionRecord:
    token = extract_bearer_token(authorization)
    if token is None:
        raise AuthenticationError("Missing bearer token")
    token_service = get_token_service(request)
    session_service = get_session_service(request)
    session_id, _ = token_service.verify_access_token(token)
    return await session_service.get_session(session_id)

