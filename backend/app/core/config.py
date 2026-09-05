from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal
from urllib.parse import urlsplit

from pydantic import Field, SecretStr, field_validator, model_validator
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
        hide_input_in_errors=True,
    )

    app_name: str = "FutureAI 學伴 API"
    app_env: Literal["development", "test", "production"] = "development"
    runtime_mode: Literal["live", "offline_demo"] = "offline_demo"
    api_prefix: str = "/api/v1"
    data_dir: Path = Field(default=DEFAULT_DATA_DIR, validation_alias="APP_DATA_DIR")
    database_url: str | None = None
    frontend_origin: str = "http://localhost:5173"
    llm_base_url: str = Field(
        default="https://api.openai.com/v1", validation_alias="LLM_BASE_URL"
    )
    llm_api_key: SecretStr | None = None
    llm_model: str | None = None
    embedding_model: str | None = None
    chroma_path: Path = Field(
        default=DEFAULT_DATA_DIR / "chroma", validation_alias="CHROMA_PATH"
    )
    agent_deadline_seconds: float = Field(
        default=45.0, ge=1.0, le=45.0, validation_alias="AGENT_DEADLINE_SECONDS"
    )
    agent_reservation_ttl_seconds: int = Field(
        default=90,
        ge=60,
        le=600,
        validation_alias="AGENT_RESERVATION_TTL_SECONDS",
    )
    idempotency_ttl_hours: int = Field(
        default=24, ge=24, le=168, validation_alias="IDEMPOTENCY_TTL_HOURS"
    )
    memory_suggestion_ttl_hours: int = Field(
        default=24,
        ge=1,
        le=168,
        validation_alias="MEMORY_SUGGESTION_TTL_HOURS",
    )
    demo_access_codes: dict[str, SecretStr] = Field(
        default_factory=dict, validation_alias="DEMO_ACCESS_CODES"
    )
    auth_session_ttl_minutes: int = Field(
        default=480, ge=1, le=480, validation_alias="AUTH_SESSION_TTL_MINUTES"
    )
    unattached_upload_ttl_hours: int = Field(
        default=24, ge=1, le=168, validation_alias="UNATTACHED_UPLOAD_TTL_HOURS"
    )
    auth_exchange_rate_limit_requests: int = Field(
        default=10,
        ge=1,
        le=1000,
        validation_alias="AUTH_EXCHANGE_RATE_LIMIT_REQUESTS",
    )
    auth_exchange_rate_limit_window_seconds: int = Field(
        default=60,
        ge=1,
        le=3600,
        validation_alias="AUTH_EXCHANGE_RATE_LIMIT_WINDOW_SECONDS",
    )
    agent_rate_limit_requests: int = Field(
        default=30,
        ge=1,
        le=1000,
        validation_alias="AGENT_RATE_LIMIT_REQUESTS",
    )
    agent_rate_limit_window_seconds: int = Field(
        default=60,
        ge=1,
        le=3600,
        validation_alias="AGENT_RATE_LIMIT_WINDOW_SECONDS",
    )
    max_json_body_bytes: int = Field(
        default=64 * 1024,
        ge=4096,
        le=1024 * 1024,
        validation_alias="MAX_JSON_BODY_BYTES",
    )
    max_multipart_body_bytes: int = Field(
        default=6 * 1024 * 1024,
        ge=5 * 1024 * 1024 + 64 * 1024,
        le=16 * 1024 * 1024,
        validation_alias="MAX_MULTIPART_BODY_BYTES",
    )

    @field_validator("data_dir", mode="before")
    @classmethod
    def resolve_data_dir(cls, value: object) -> Path:
        path = Path(str(value)).expanduser()
        if not path.is_absolute():
            path = BACKEND_ROOT / path
        return path.resolve()

    @field_validator("chroma_path", mode="before")
    @classmethod
    def resolve_chroma_path(cls, value: object) -> Path:
        path = Path(str(value)).expanduser()
        if not path.is_absolute():
            path = BACKEND_ROOT / path
        return path.resolve()

    @field_validator("frontend_origin")
    @classmethod
    def validate_frontend_origins(cls, value: str) -> str:
        origins = [item.strip().rstrip("/") for item in value.split(",")]
        if not origins or any(not item for item in origins):
            raise ValueError("FRONTEND_ORIGIN must contain an exact HTTP(S) origin")
        for origin in origins:
            parsed = urlsplit(origin)
            if (
                parsed.scheme not in {"http", "https"}
                or not parsed.netloc
                or parsed.username is not None
                or parsed.password is not None
                or parsed.path
                or parsed.query
                or parsed.fragment
                or "*" in origin
            ):
                raise ValueError(
                    "FRONTEND_ORIGIN must contain exact HTTP(S) origins without paths"
                )
        if len(set(origins)) != len(origins):
            raise ValueError("FRONTEND_ORIGIN contains a duplicate origin")
        return ",".join(origins)

    @model_validator(mode="after")
    def validate_live_provider_configuration(self) -> Settings:
        if self.runtime_mode != "live":
            return self
        missing: list[str] = []
        if self.llm_api_key is None or not self.llm_api_key.get_secret_value().strip():
            missing.append("LLM_API_KEY")
        if not self.llm_model or not self.llm_model.strip():
            missing.append("LLM_MODEL")
        if not self.embedding_model or not self.embedding_model.strip():
            missing.append("EMBEDDING_MODEL")
        parsed = urlsplit(self.llm_base_url)
        if (
            parsed.scheme not in {"http", "https"}
            or not parsed.netloc
            or parsed.username is not None
            or parsed.password is not None
            or parsed.query
            or parsed.fragment
        ):
            raise ValueError(
                "LLM_BASE_URL must be an HTTP(S) URL without credentials, query, or fragment"
            )
        if missing:
            raise ValueError(
                "live runtime configuration is incomplete: " + ", ".join(missing)
            )
        return self

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

    @property
    def allowed_frontend_origins(self) -> list[str]:
        return self.frontend_origin.split(",")

    def prepare_directories(self) -> None:
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.chroma_path.mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    return Settings()
