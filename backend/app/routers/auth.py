from fastapi import APIRouter, Request

from app.core.dependencies import (
    AppSettingsDependency,
    CurrentPrincipalDependency,
    DbSessionDependency,
)
from app.core.errors import AppError
from app.core.rate_limit import check_request_rate
from app.schemas.auth import (
    DemoSessionRequestWire,
    SessionCheckWire,
    SessionResponseWire,
    UsageWire,
)
from app.services.auth import (
    check_session,
    create_offline_demo_session,
    exchange_access_code,
    get_usage,
)

router = APIRouter(tags=["auth"])


@router.post("/auth/demo/session", response_model=SessionResponseWire)
def create_demo_session(
    body: DemoSessionRequestWire,
    request: Request,
    db: DbSessionDependency,
    settings: AppSettingsDependency,
) -> SessionResponseWire:
    client_host = request.client.host if request.client is not None else "unknown"
    retry_after = check_request_rate(
        request,
        namespace="auth_exchange",
        subject=client_host,
        limit=settings.auth_exchange_rate_limit_requests,
        window_seconds=settings.auth_exchange_rate_limit_window_seconds,
    )
    if retry_after is not None:
        raise AppError(
            status_code=429,
            code="RATE_LIMITED",
            message="示範登入過於頻繁，請稍後再試。",
            retryable=True,
            details={"retry_after_seconds": retry_after},
            headers={"Retry-After": str(retry_after)},
        )
    if body.role is not None:
        return create_offline_demo_session(db, settings, body.role)
    if body.access_code is None:  # Guarded by request validation.
        raise AssertionError("validated session request has no login method")
    return exchange_access_code(db, settings, body.access_code)


@router.get("/auth/session", response_model=SessionCheckWire)
def get_session(
    current: CurrentPrincipalDependency,
    db: DbSessionDependency,
    settings: AppSettingsDependency,
) -> SessionCheckWire:
    return check_session(db, settings, current.auth_session, current.user)


@router.get("/usage", response_model=UsageWire)
def usage(
    current: CurrentPrincipalDependency,
    db: DbSessionDependency,
) -> UsageWire:
    return get_usage(db, current.principal)
