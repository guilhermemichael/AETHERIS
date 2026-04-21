from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.core.constants import DEFAULT_ROOM_ID


class Settings(BaseSettings):
    app_name: str = Field(default="AETHERIS backend")
    api_v1_prefix: str = Field(default="/api/v1")
    env: str = Field(default="development")
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://127.0.0.1:5173", "http://localhost:5173"]
    )
    default_room_id: str = Field(default=DEFAULT_ROOM_ID)

    model_config = SettingsConfigDict(
        env_prefix="AETHERIS_",
        env_file=".env",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()

