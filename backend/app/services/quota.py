from __future__ import annotations

import hashlib
import json
import math
from dataclasses import dataclass
from datetime import datetime, time, timedelta, timezone

from sqlalchemy import or_, select, update
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.errors import AppError
from app.db.models import (
    DemoPrincipal,
    IdempotencyRecord,
    QuotaLedger,
    QuotaReservation,
    new_id,
)
from app.schemas.auth import UsageWire
from app.schemas.chat import AgentChatRequestWire, AgentChatResponseWire
from app.schemas.enums import IdempotencyStatus, ReservationStatus
from app.services.common import as_utc, utc_now

AGENT_OPERATION = "agent_chat"


@dataclass(frozen=True, slots=True)
class ReservedAgentRequest:
    reservation_id: str
    attempt_id: str
    idempotency_record_id: str
    ledger_id: str


@dataclass(frozen=True, slots=True)
class ReservationResult:
    reservation: ReservedAgentRequest | None
    replay: AgentChatResponseWire | None


def request_fingerprint(body: AgentChatRequestWire) -> str:
    canonical = json.dumps(
        body.model_dump(mode="json", exclude_none=False),
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _daily_window(now: datetime) -> tuple[datetime, datetime]:
    start = datetime.combine(now.date(), time.min, timezone.utc)
    return start, start + timedelta(days=1)


def _usage_values(
    quota_limit: int,
    used_count: int,
    reserved_count: int,
    window_end: datetime,
) -> UsageWire:
    return UsageWire(
        limit=quota_limit,
        used=used_count,
        reserved=reserved_count,
        remaining=max(quota_limit - used_count - reserved_count, 0),
        reset_at=as_utc(window_end),
    )


def _fresh_usage(db: Session, ledger_id: str) -> UsageWire:
    row = db.execute(
        select(
            QuotaLedger.quota_limit,
            QuotaLedger.used_count,
            QuotaLedger.reserved_count,
            QuotaLedger.window_end,
        ).where(QuotaLedger.id == ledger_id)
    ).one_or_none()
    if row is None:
        raise RuntimeError("quota ledger no longer exists")
    return _usage_values(
        row.quota_limit,
        row.used_count,
        row.reserved_count,
        row.window_end,
    )


def _claim_reservation_transition(
    db: Session,
    reservation_id: str,
    attempt_id: str,
    target: ReservationStatus,
    now: datetime,
) -> tuple[str, str, int] | None:
    row = db.execute(
        update(QuotaReservation)
        .where(
            QuotaReservation.id == reservation_id,
            QuotaReservation.attempt_id == attempt_id,
            QuotaReservation.status == ReservationStatus.RESERVED,
        )
        .values(status=target, finalized_at=now)
        .returning(
            QuotaReservation.ledger_id,
            QuotaReservation.idempotency_record_id,
            QuotaReservation.amount,
        )
        .execution_options(synchronize_session=False)
    ).one_or_none()
    if row is None:
        return None
    return row.ledger_id, row.idempotency_record_id, row.amount


def _move_reserved_count(
    db: Session,
    ledger_id: str,
    amount: int,
    *,
    finalize: bool,
    now: datetime,
) -> UsageWire:
    values: dict[str, object] = {
        "reserved_count": QuotaLedger.reserved_count - amount,
        "version": QuotaLedger.version + 1,
        "updated_at": now,
    }
    if finalize:
        values["used_count"] = QuotaLedger.used_count + amount
    row = db.execute(
        update(QuotaLedger)
        .where(
            QuotaLedger.id == ledger_id,
            QuotaLedger.reserved_count >= amount,
        )
        .values(**values)
        .returning(
            QuotaLedger.quota_limit,
            QuotaLedger.used_count,
            QuotaLedger.reserved_count,
            QuotaLedger.window_end,
        )
        .execution_options(synchronize_session=False)
    ).one_or_none()
    if row is None:
        raise RuntimeError("quota reservation has no matching reserved ledger count")
    return _usage_values(
        row.quota_limit,
        row.used_count,
        row.reserved_count,
        row.window_end,
    )


def _release_reservation(
    db: Session,
    reservation_id: str,
    attempt_id: str,
    now: datetime,
) -> bool:
    transition = _claim_reservation_transition(
        db, reservation_id, attempt_id, ReservationStatus.RELEASED, now
    )
    if transition is None:
        return False
    ledger_id, record_id, amount = transition
    _move_reserved_count(db, ledger_id, amount, finalize=False, now=now)
    failed = db.execute(
        update(IdempotencyRecord)
        .where(
            IdempotencyRecord.id == record_id,
            IdempotencyRecord.status == IdempotencyStatus.RESERVED,
        )
        .values(status=IdempotencyStatus.FAILED, updated_at=now)
        .execution_options(synchronize_session=False)
    )
    if failed.rowcount != 1:
        raise RuntimeError("released reservation has no reserved idempotency record")
    return True


def recover_reservations(db: Session) -> int:
    """Release only leases whose real-time expiry has passed."""

    now = utc_now()
    reservations = list(
        db.execute(
            select(QuotaReservation.id, QuotaReservation.attempt_id).where(
                QuotaReservation.status == ReservationStatus.RESERVED,
                QuotaReservation.expires_at <= now,
            )
        )
    )
    released = sum(
        _release_reservation(db, reservation_id, attempt_id, now)
        for reservation_id, attempt_id in reservations
    )
    db.commit()
    return released


def _existing_result(
    db: Session,
    record: IdempotencyRecord,
    request_hash: str,
    now: datetime,
) -> ReservationResult | None:
    if record.request_hash != request_hash:
        raise AppError(
            status_code=409,
            code="IDEMPOTENCY_CONFLICT",
            message="同一個 Idempotency-Key 不可用於不同請求。",
        )
    if record.status == IdempotencyStatus.COMPLETED:
        if record.response_snapshot is None:
            raise AppError(
                status_code=500,
                code="INTERNAL_ERROR",
                message="已完成請求缺少可重播的回應。",
                retryable=True,
            )
        return ReservationResult(
            reservation=None,
            replay=AgentChatResponseWire.model_validate(record.response_snapshot),
        )
    if record.status == IdempotencyStatus.RESERVED:
        reservation = db.scalar(
            select(QuotaReservation).where(
                QuotaReservation.idempotency_record_id == record.id
            )
        )
        if reservation is not None and as_utc(reservation.expires_at) <= now:
            _release_reservation(db, reservation.id, reservation.attempt_id, now)
            db.refresh(record)
            db.refresh(reservation)
            return None
        raise AppError(
            status_code=409,
            code="IDEMPOTENCY_CONFLICT",
            message="相同請求仍在處理中，請稍後用同一個 key 重試。",
            retryable=True,
        )
    return None


def reserve_agent_request(
    db: Session,
    settings: Settings,
    principal: DemoPrincipal,
    idempotency_key: str,
    body: AgentChatRequestWire,
) -> ReservationResult:
    now = utc_now()
    request_hash = request_fingerprint(body)
    window_start, window_end = _daily_window(now)
    recover_reservations(db)
    try:
        candidate_record_id = new_id("idem")
        inserted = db.execute(
            sqlite_insert(IdempotencyRecord)
            .values(
                id=candidate_record_id,
                principal_id=principal.id,
                operation=AGENT_OPERATION,
                idempotency_key=idempotency_key,
                request_hash=request_hash,
                status=IdempotencyStatus.RESERVED,
                response_status=None,
                response_snapshot=None,
                resource_id=None,
                expires_at=now + timedelta(hours=settings.idempotency_ttl_hours),
                created_at=now,
                updated_at=now,
            )
            .on_conflict_do_nothing(
                index_elements=["principal_id", "operation", "idempotency_key"]
            )
        )
        record_id = candidate_record_id
        record = db.scalar(
            select(IdempotencyRecord).where(
                IdempotencyRecord.principal_id == principal.id,
                IdempotencyRecord.operation == AGENT_OPERATION,
                IdempotencyRecord.idempotency_key == idempotency_key,
            )
        )
        if record is None:
            raise RuntimeError("idempotency record could not be created")
        if inserted.rowcount == 0 and as_utc(record.expires_at) <= now:
            db.delete(record)
            db.commit()
            return reserve_agent_request(db, settings, principal, idempotency_key, body)
        if inserted.rowcount == 0:
            existing = _existing_result(db, record, request_hash, now)
            if existing is not None:
                db.commit()
                return existing

            claimed = db.execute(
                update(IdempotencyRecord)
                .where(
                    IdempotencyRecord.id == record.id,
                    IdempotencyRecord.status == IdempotencyStatus.FAILED,
                )
                .values(
                    status=IdempotencyStatus.RESERVED,
                    response_status=None,
                    response_snapshot=None,
                    resource_id=None,
                    expires_at=now + timedelta(hours=settings.idempotency_ttl_hours),
                    updated_at=now,
                )
                .execution_options(synchronize_session=False)
            )
            if claimed.rowcount != 1:
                db.rollback()
                raise AppError(
                    status_code=409,
                    code="IDEMPOTENCY_CONFLICT",
                    message="相同請求仍在處理中，請稍後用同一個 key 重試。",
                    retryable=True,
                )
            record_id = record.id

        ledger_id = new_id("quota")
        db.execute(
            sqlite_insert(QuotaLedger)
            .values(
                id=ledger_id,
                principal_id=principal.id,
                window_start=window_start,
                window_end=window_end,
                quota_limit=principal.daily_quota_limit,
                used_count=0,
                reserved_count=0,
                version=0,
                created_at=now,
                updated_at=now,
            )
            .on_conflict_do_nothing(index_elements=["principal_id", "window_start"])
        )
        stored_ledger_id = db.scalar(
            select(QuotaLedger.id).where(
                QuotaLedger.principal_id == principal.id,
                QuotaLedger.window_start == window_start,
            )
        )
        if stored_ledger_id is None:
            raise RuntimeError("quota ledger could not be created")
        if settings.runtime_mode == "offline_demo":
            # Keep the existing ledger constraint and request accounting, but
            # grow capacity on demand: offline requests have no daily ceiling.
            db.execute(
                update(QuotaLedger)
                .where(
                    QuotaLedger.id == stored_ledger_id,
                    QuotaLedger.used_count + QuotaLedger.reserved_count
                    >= QuotaLedger.quota_limit,
                )
                .values(quota_limit=QuotaLedger.used_count + QuotaLedger.reserved_count + 1)
                .execution_options(synchronize_session=False)
            )
        reserved = db.execute(
            update(QuotaLedger)
            .where(
                QuotaLedger.id == stored_ledger_id,
                QuotaLedger.used_count + QuotaLedger.reserved_count
                < QuotaLedger.quota_limit,
                # Live mode must not inherit capacity grown during an offline Demo.
                or_(
                    settings.runtime_mode == "offline_demo",
                    QuotaLedger.used_count + QuotaLedger.reserved_count
                    < principal.daily_quota_limit,
                ),
            )
            .values(
                reserved_count=QuotaLedger.reserved_count + 1,
                version=QuotaLedger.version + 1,
                updated_at=now,
            )
            .execution_options(synchronize_session=False)
        )
        if reserved.rowcount != 1:
            usage_wire = _fresh_usage(db, stored_ledger_id)
            usage = usage_wire.model_dump(mode="json")
            retry_after = max(
                1,
                math.ceil((as_utc(usage_wire.reset_at) - now).total_seconds()),
            )
            db.rollback()
            raise AppError(
                status_code=429,
                code="QUOTA_EXCEEDED",
                message="今天的 Agent 使用次數已用完。",
                retryable=True,
                details={
                    "usage": usage,
                    "retry_after_seconds": retry_after,
                },
                headers={"Retry-After": str(retry_after)},
            )

        attempt_id = new_id("attempt")
        reservation = db.scalar(
            select(QuotaReservation).where(
                QuotaReservation.idempotency_record_id == record_id
            )
        )
        if reservation is None:
            reservation = QuotaReservation(
                id=new_id("reservation"),
                attempt_id=attempt_id,
                ledger_id=stored_ledger_id,
                idempotency_record_id=record_id,
                amount=1,
                status=ReservationStatus.RESERVED,
                expires_at=now
                + timedelta(seconds=settings.agent_reservation_ttl_seconds),
                created_at=now,
                finalized_at=None,
            )
            db.add(reservation)
        else:
            reservation.attempt_id = attempt_id
            reservation.ledger_id = stored_ledger_id
            reservation.status = ReservationStatus.RESERVED
            reservation.expires_at = now + timedelta(
                seconds=settings.agent_reservation_ttl_seconds
            )
            reservation.finalized_at = None
            reservation.created_at = now
        db.commit()
        return ReservationResult(
            reservation=ReservedAgentRequest(
                reservation_id=reservation.id,
                attempt_id=attempt_id,
                idempotency_record_id=record_id,
                ledger_id=stored_ledger_id,
            ),
            replay=None,
        )
    except AppError:
        raise
    except IntegrityError as exc:
        db.rollback()
        raced = db.scalar(
            select(IdempotencyRecord).where(
                IdempotencyRecord.principal_id == principal.id,
                IdempotencyRecord.operation == AGENT_OPERATION,
                IdempotencyRecord.idempotency_key == idempotency_key,
            )
        )
        if raced is not None:
            existing = _existing_result(db, raced, request_hash, utc_now())
            if existing is not None:
                return existing
        raise AppError(
            status_code=409,
            code="IDEMPOTENCY_CONFLICT",
            message="相同請求仍在處理中，請稍後用同一個 key 重試。",
            retryable=True,
        ) from exc


def release_agent_request(db: Session, reserved: ReservedAgentRequest) -> None:
    db.rollback()
    if _release_reservation(
        db, reserved.reservation_id, reserved.attempt_id, utc_now()
    ):
        db.commit()


def finalize_agent_request(
    db: Session,
    reserved: ReservedAgentRequest,
    response: AgentChatResponseWire,
) -> UsageWire:
    now = utc_now()
    transition = _claim_reservation_transition(
        db,
        reserved.reservation_id,
        reserved.attempt_id,
        ReservationStatus.FINALIZED,
        now,
    )
    if transition is None:
        row = db.execute(
            select(
                QuotaReservation.attempt_id,
                QuotaReservation.status,
                QuotaReservation.ledger_id,
                QuotaReservation.idempotency_record_id,
            ).where(QuotaReservation.id == reserved.reservation_id)
        ).one_or_none()
        if (
            row is None
            or row.attempt_id != reserved.attempt_id
            or row.ledger_id != reserved.ledger_id
            or row.idempotency_record_id != reserved.idempotency_record_id
        ):
            raise RuntimeError("agent reservation attempt identity does not match")
        if row.status != ReservationStatus.FINALIZED:
            raise RuntimeError("agent reservation cannot be finalized")
        usage = _fresh_usage(db, reserved.ledger_id)
        response.usage = usage
        return usage
    ledger_id, record_id, amount = transition
    if ledger_id != reserved.ledger_id or record_id != reserved.idempotency_record_id:
        raise RuntimeError("agent reservation identity does not match")
    usage = _move_reserved_count(db, ledger_id, amount, finalize=True, now=now)
    response.usage = usage
    completed = db.execute(
        update(IdempotencyRecord)
        .where(
            IdempotencyRecord.id == record_id,
            IdempotencyRecord.status == IdempotencyStatus.RESERVED,
        )
        .values(
            status=IdempotencyStatus.COMPLETED,
            response_status=200,
            resource_id=response.message_id,
            response_snapshot=response.model_dump(mode="json"),
            updated_at=now,
        )
        .execution_options(synchronize_session=False)
    )
    if completed.rowcount != 1:
        raise RuntimeError("agent reservation has no reserved idempotency record")
    return usage
