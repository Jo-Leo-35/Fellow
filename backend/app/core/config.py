from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DATA_DIR = BACKEND_ROOT / "data"


class Settings(BaseSettings):
    """Runtime configuration with paths resolved independently of the process cwd."""

    model_config = SettingsConfigDict(
        env_file=BACKEND_ROOT / ".env",
        env_file_encoding="utf-8",
        env_prefix="",
        extra="ignore",
        populate_by_name=True,
    )

    app_name: str = "FutureAI 學伴 API"
    app_env: Literal["development", "test", "production"] = "development"
    runtime_mode: Literal["live", "offline_demo"] = "offline_demo"
    api_prefix: str = "/api/v1"
    data_dir: Path = Field(default=DEFAULT_DATA_DIR, validation_alias="APP_DATA_DIR")
    database_url: str | None = None
    frontend_origin: str = "http://localhost:5173"
    llm_api_key: SecretStr | None = None
    llm_model: str | None = None
    embedding_model: str | None = None

    @field_validator("data_dir", mode="before")
    @classmethod
    def resolve_data_dir(cls, value: object) -> Path:
        path = Path(str(value)).expanduser()
        if not path.is_absolute():
            path = BACKEND_ROOT / path
        return path.resolve()

    @property
    def resolved_database_url(self) -> str:
        if self.database_url:
            for prefix in ("sqlite:///", "sqlite+pysqlite:///"):
                if self.database_url.startswith(prefix):
                    database_path = self.database_url.removeprefix(prefix)
                    if database_path == ":memory:" or database_path.startswith("file:"):
                        return self.database_url
                    path = Path(database_path).expanduser()
                    if not path.is_absolute():
                        path = BACKEND_ROOT / path
                    return f"{prefix}{path.resolve()}"
            return self.database_url
        return f"sqlite:///{self.data_dir / 'app.db'}"

    @property
    def upload_dir(self) -> Path:
        return self.data_dir / "uploads"

    def prepare_directories(self) -> None:
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.upload_dir.mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    return Settings()
