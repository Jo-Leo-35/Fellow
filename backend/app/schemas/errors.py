from __future__ import annotations

from typing import Any, Literal

from app.schemas.auth import UsageWire
from app.schemas.common import StrictModel
from app.schemas.enums import RuntimeMode

ErrorCode = Literal[
    "VALIDATION_ERROR",
    "UNAUTHORIZED",
    "SESSION_EXPIRED",
    "INVALID_ACCESS_CODE",
    "FORBIDDEN",
    "USER_SCOPE_FORBIDDEN",
    "PROFILE_NOT_FOUND",
    "CONVERSATION_NOT_FOUND",
    "CONVERSATION_MODE_CONFLICT",
    "RESOURCE_NOT_FOUND",
    "ALERT_NOT_FOUND",
    "ATTACHMENT_NOT_FOUND",
    "MEMORY_SUGGESTION_NOT_FOUND",
    "MEMORY_SUGGESTION_EXPIRED",
    "UNSUPPORTED_MEDIA_TYPE",
    "FILE_TOO_LARGE",
    "UPLOAD_INVALID",
    "IDEMPOTENCY_CONFLICT",
    "QUOTA_EXCEEDED",
    "RATE_LIMITED",
    "REQUEST_TIMEOUT",
    "PROVIDER_UNAVAILABLE",
    "PROVIDER_ERROR",
    "OFFLINE_DEMO_UNAVAILABLE",
    "INTERNAL_ERROR",
]


class FieldErrorWire(StrictModel):
    field: str
    code: str
    message: str


class ErrorDetailsWire(StrictModel):
    fields: list[FieldErrorWire] | None = None
    usage: UsageWire | None = None
    retry_after_seconds: int | None = None


class ApiErrorBodyWire(StrictModel):
    code: ErrorCode
    message: str
    request_id: str
    retryable: bool
    runtime_mode: RuntimeMode
    details: ErrorDetailsWire | dict[str, Any] | None = None


class ApiErrorWire(StrictModel):
    error: ApiErrorBodyWire
