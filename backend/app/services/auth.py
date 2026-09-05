from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, time, timedelta, timezone

from fastapi import Request
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.errors import AppError
from app.db.models import (
    AuthSession,
    DemoPrincipal,
    QuotaLedger,
    TeacherClass,
    User,
    new_id,
)
from app.schemas.auth import (
    SessionCheckWire,
    SessionIdentityWire,
    SessionResponseWire,
    UsageWire,
)
from app.schemas.enums import Role
from app.services.common import as_utc, utc_now


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _unauthorized(
    code: str = "UNAUTHORIZED", message: str = "需要有效的登入憑證。"
) -> AppError:
    return AppError(
        status_code=401,
        code=code,
        message=message,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _identity(db: Session, user: User) -> SessionIdentityWire:
    scope_label: str | None = None
    if user.role == Role.TEACHER:
        scope_label = db.scalar(
            select(TeacherClass.school_name)
            .where(TeacherClass.teacher_user_id == user.id)
            .order_by(TeacherClass.school_name)
            .limit(1)
        )
    elif user.role == Role.GOVERNMENT:
        scope_label = "高雄六區匿名彙整"
    return SessionIdentityWire(
        user_id=user.id,
        role=user.role,
        display_name=user.nickname,
        scope_label=scope_label,
    )


def exchange_access_code(
    db: Session,
    settings: Settings,
    access_code: str,
) -> SessionResponseWire:
    matching_keys = [
        config_key
        for config_key, configured in settings.demo_access_codes.items()
        if secrets.compare_digest(
            access_code.encode("utf-8"), configured.get_secret_value().encode("utf-8")
        )
    ]
    if len(matching_keys) != 1:
        raise _unauthorized("INVALID_ACCESS_CODE", "存取碼無效。")

    row = db.execute(
        select(DemoPrincipal, User)
        .join(User, User.id == DemoPrincipal.user_id)
        .where(
            DemoPrincipal.config_key == matching_keys[0],
            DemoPrincipal.enabled.is_(True),
        )
    ).one_or_none()
    if row is None:
        raise _unauthorized("INVALID_ACCESS_CODE", "存取碼無效。")
    principal, user = row
    return _create_session(db, settings, principal, user)


def create_offline_demo_session(
    db: Session,
    settings: Settings,
    role: Role | str,
) -> SessionResponseWire:
    if settings.runtime_mode != "offline_demo":
        raise _unauthorized("ACCESS_CODE_REQUIRED", "線上服務需要輸入存取碼。")

    normalized_role = Role(role)
    config_key = f"{normalized_role.value}_demo"
    row = db.execute(
        select(DemoPrincipal, User)
        .join(User, User.id == DemoPrincipal.user_id)
        .where(
            DemoPrincipal.config_key == config_key,
            DemoPrincipal.enabled.is_(True),
            User.role == normalized_role,
        )
    ).one_or_none()
    if row is None:
        raise AppError(
            status_code=503,
            code="DEMO_IDENTITY_UNAVAILABLE",
            message="此示範角色目前無法使用。",
            retryable=False,
        )
    principal, user = row
    return _create_session(db, settings, principal, user)


def _create_session(
    db: Session,
    settings: Settings,
    principal: DemoPrincipal,
    user: User,
) -> SessionResponseWire:

    now = utc_now()
    expires_at = now + timedelta(minutes=settings.auth_session_ttl_minutes)
    token = secrets.token_urlsafe(48)
    db.add(
        AuthSession(
            id=new_id("session"),
            principal_id=principal.id,
            token_hash=_token_hash(token),
            expires_at=expires_at,
            created_at=now,
        )
    )
    db.commit()
    return SessionResponseWire(
        access_token=token,
        expires_at=expires_at,
        runtime_mode=settings.runtime_mode,
        session=_identity(db, user),
    )


def authenticate_bearer_token(
    request: Request, db: Session
) -> tuple[AuthSession, DemoPrincipal, User]:
    authorization = request.headers.get("Authorization")
    if not authorization:
        raise _unauthorized()
    scheme, separator, token = authorization.partition(" ")
    if not separator or scheme.lower() != "bearer" or not token or len(token) > 512:
        raise _unauthorized()

    candidate_hash = _token_hash(token)
    row = db.execute(
        select(AuthSession, DemoPrincipal, User)
        .join(DemoPrincipal, DemoPrincipal.id == AuthSession.principal_id)
        .join(User, User.id == DemoPrincipal.user_id)
        .where(AuthSession.token_hash == candidate_hash)
    ).one_or_none()
    if row is None:
        raise _unauthorized()
    auth_session, principal, user = row
    if not secrets.compare_digest(auth_session.token_hash, candidate_hash):
        raise _unauthorized()
    if auth_session.revoked_at is not None or not principal.enabled:
        raise _unauthorized()
    if as_utc(auth_session.expires_at) <= utc_now():
        raise _unauthorized("SESSION_EXPIRED", "登入階段已過期，請重新輸入存取碼。")
    return auth_session, principal, user


def check_session(
    db: Session,
    settings: Settings,
    auth_session: AuthSession,
    user: User,
) -> SessionCheckWire:
    return SessionCheckWire(
        expires_at=as_utc(auth_session.expires_at),
        runtime_mode=settings.runtime_mode,
        session=_identity(db, user),
    )


def _daily_window(now: datetime) -> tuple[datetime, datetime]:
    start = datetime.combine(now.date(), time.min, timezone.utc)
    return start, start + timedelta(days=1)


def get_usage(db: Session, principal: DemoPrincipal) -> UsageWire:
    now = utc_now()
    window_start, window_end = _daily_window(now)
    ledger = db.scalar(
        select(QuotaLedger).where(
            QuotaLedger.principal_id == principal.id,
            QuotaLedger.window_start == window_start,
        )
    )
    if ledger is None:
        ledger = QuotaLedger(
            id=new_id("quota"),
            principal_id=principal.id,
            window_start=window_start,
            window_end=window_end,
            quota_limit=principal.daily_quota_limit,
            used_count=0,
            reserved_count=0,
            version=0,
        )
        db.add(ledger)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            ledger = db.scalar(
                select(QuotaLedger).where(
                    QuotaLedger.principal_id == principal.id,
                    QuotaLedger.window_start == window_start,
                )
            )
            if ledger is None:
                raise
    return UsageWire(
        limit=ledger.quota_limit,
        used=ledger.used_count,
        reserved=ledger.reserved_count,
        remaining=max(
            ledger.quota_limit - ledger.used_count - ledger.reserved_count, 0
        ),
        reset_at=as_utc(ledger.window_end),
    )
