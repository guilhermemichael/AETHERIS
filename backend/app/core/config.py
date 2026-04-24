from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.core.constants import DEFAULT_CORS_ORIGINS, DEFAULT_ROOM_ID, DEFAULT_TRUSTED_HOSTS


class Settings(BaseSettings):
    app_name: str = Field(default="AETHERIS backend")
    api_v1_prefix: str = Field(default="/api/v1")
    env: str = Field(default="development")
    cors_origins: list[str] = Field(default_factory=lambda: list(DEFAULT_CORS_ORIGINS))
    trusted_hosts: list[str] = Field(default_factory=lambda: list(DEFAULT_TRUSTED_HOSTS))
    default_room_id: str = Field(default=DEFAULT_ROOM_ID)
    database_url: str | None = Field(default=None)
    redis_url: str | None = Field(default=None)
    session_repository_backend: Literal["auto", "memory", "postgres"] = "auto"
    presence_repository_backend: Literal["auto", "memory", "redis"] = "auto"
    token_secret: str = Field(default="development-only-change-me-32-bytes")
    token_algorithm: Literal["HS256"] = "HS256"
    token_expiration_minutes: int = Field(default=60, ge=5, le=1440)
    rate_limit_requests: int = Field(default=120, ge=1)
    rate_limit_window_seconds: int = Field(default=60, ge=1, le=3600)
    presence_ttl_seconds: int = Field(default=30, ge=5, le=300)
    heartbeat_ttl_seconds: int = Field(default=15, ge=5, le=120)
    log_level: str = Field(default="INFO")

    model_config = SettingsConfigDict(
        env_prefix="AETHERIS_",
        env_file=".env",
        extra="ignore",
    )

    @field_validator("cors_origins", "trusted_hosts", mode="before")
    @classmethod
    def parse_csv_list(cls, value: object) -> object:
        if value is None or isinstance(value, list):
            return value
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()

