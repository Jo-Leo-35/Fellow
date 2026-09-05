from __future__ import annotations

import asyncio
from typing import Annotated

from fastapi import APIRouter, Header, Request

from app.core.dependencies import (
    AppSettingsDependency,
    DbSessionDependency,
    StudentPrincipalDependency,
    require_self,
)
from app.core.errors import AppError
from app.core.rate_limit import check_request_rate
from app.schemas.chat import AgentChatRequestWire, AgentChatResponseWire
from app.services.agent import chat
from app.services.auth import get_usage

router = APIRouter(tags=["agent"])


async def _chat_endpoint(
    body: AgentChatRequestWire,
    idempotency_key: str,
    request: Request,
    current: StudentPrincipalDependency,
    db: DbSessionDependency,
    settings: AppSettingsDependency,
) -> AgentChatResponseWire:
    require_self(body.user_id, current)
    idempotency_key = idempotency_key.strip()
    if not idempotency_key:
        raise AppError(
            status_code=422,
            code="VALIDATION_ERROR",
            message="Idempotency-Key 不可為空白。",
            details={
                "fields": [
                    {
                        "field": "Idempotency-Key",
                        "code": "string_blank",
                        "message": "Idempotency-Key 不可為空白。",
                    }
                ]
            },
        )
    retry_after = check_request_rate(
        request,
        namespace="agent",
        subject=current.principal.id,
        limit=settings.agent_rate_limit_requests,
        window_seconds=settings.agent_rate_limit_window_seconds,
    )
    if retry_after is not None:
        usage = get_usage(db, current.principal)
        raise AppError(
            status_code=429,
            code="RATE_LIMITED",
            message="Agent 請求過於頻繁，請稍後再試。",
            retryable=True,
            details={
                "retry_after_seconds": retry_after,
                "usage": usage.model_dump(mode="json"),
            },
            headers={"Retry-After": str(retry_after)},
        )
    try:
        async with asyncio.timeout(settings.agent_deadline_seconds):
            return await chat(db, settings, current, body, idempotency_key)
    except TimeoutError as exc:
        raise AppError(
            status_code=504,
            code="REQUEST_TIMEOUT",
            message="Agent 請求超過伺服器時間限制。",
            retryable=True,
        ) from exc


@router.post("/agent/chat", response_model=AgentChatResponseWire)
async def agent_chat(
    body: AgentChatRequestWire,
    request: Request,
    current: StudentPrincipalDependency,
    db: DbSessionDependency,
    settings: AppSettingsDependency,
    idempotency_key: Annotated[
        str, Header(alias="Idempotency-Key", min_length=1, max_length=128)
    ],
) -> AgentChatResponseWire:
    return await _chat_endpoint(body, idempotency_key, request, current, db, settings)


@router.post("/chat", response_model=AgentChatResponseWire)
async def compatible_chat(
    body: AgentChatRequestWire,
    request: Request,
    current: StudentPrincipalDependency,
    db: DbSessionDependency,
    settings: AppSettingsDependency,
    idempotency_key: Annotated[
        str, Header(alias="Idempotency-Key", min_length=1, max_length=128)
    ],
) -> AgentChatResponseWire:
    return await _chat_endpoint(body, idempotency_key, request, current, db, settings)
