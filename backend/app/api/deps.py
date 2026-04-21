from fastapi import Request

from app.services.session_service import SessionService


def get_session_service(request: Request) -> SessionService:
    return request.app.state.session_service

