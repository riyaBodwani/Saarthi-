from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BACKEND_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    database_url: str = Field(
        default=f"sqlite:///{(BACKEND_ROOT / 'saarthi.db').as_posix()}"
    )
    jwt_secret: str = "change-me-in-production-saarthi-secret"
    access_token_expire_minutes: int = 1440
    cors_origins: str = (
        "http://127.0.0.1:5173,http://localhost:5173,"
        "http://127.0.0.1:5174,http://localhost:5174"
    )
    client_url: str = "http://127.0.0.1:5173"
    file_storage_path: str = str(BACKEND_ROOT / "storage" / "uploads")
    max_upload_size: int = 10 * 1024 * 1024
    display_timezone: str = "Asia/Kolkata"

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
