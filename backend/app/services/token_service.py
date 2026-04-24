from datetime import UTC, datetime, timedelta
from uuid import UUID

import jwt
from jwt import InvalidTokenError

from app.core.config import Settings
from app.core.errors import AuthenticationError


class TokenService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def expires_at(self, now: datetime | None = None) -> datetime:
        base = now or datetime.now(UTC)
        return base + timedelta(minutes=self.settings.token_expiration_minutes)

    def issue_access_token(self, session_id: UUID, *, room_id: str, expires_at: datetime) -> str:
        payload = {
            "sub": str(session_id),
            "room_id": room_id,
            "exp": expires_at,
            "iat": datetime.now(UTC),
        }
        return jwt.encode(
            payload,
            self.settings.token_secret,
            algorithm=self.settings.token_algorithm,
        )

    def verify_access_token(self, token: str) -> tuple[UUID, str | None]:
        try:
            payload = jwt.decode(
                token,
                self.settings.token_secret,
                algorithms=[self.settings.token_algorithm],
            )
        except InvalidTokenError as exc:
            raise AuthenticationError("Invalid access token") from exc

        subject = payload.get("sub")
        if not isinstance(subject, str):
            raise AuthenticationError("Token subject missing")
        room_id = payload.get("room_id")
        return UUID(subject), room_id if isinstance(room_id, str) else None
