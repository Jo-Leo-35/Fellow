from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.db.models import Alert, AlertRead, Profile, User, new_id
from app.schemas.alerts import AlertActionWire, AlertListWire, AlertWire
from app.schemas.enums import Role
from app.services.common import as_utc, normalize_region, utc_now


def _matches(alert: Alert, user: User, profile: Profile, now: datetime) -> bool:
    if alert.active_from is not None and as_utc(alert.active_from) > now:
        return False
    if alert.expires_at is not None and as_utc(alert.expires_at) <= now:
        return False
    if alert.region is not None:
        alert_region = normalize_region(alert.region)
        user_region = normalize_region(user.region)
        if alert_region is None or user_region != alert_region:
            return False
    feature = alert.target_feature
    if feature is None:
        return True
    if feature == "student":
        return user.role == Role.STUDENT
    if feature == "farmer":
        return (profile.family_occupation or "").strip().casefold() in {
            "farmer",
            "農業",
            "農民",
            "務農",
            "家裡從事農業",
        }
    return False


def _alert_wire(alert: Alert, read_at: datetime | None) -> AlertWire:
    return AlertWire(
        alert_id=alert.id,
        kind=alert.kind,
        title=alert.title,
        message=alert.message,
        reason=alert.reason,
        created_at=as_utc(alert.created_at),
        read_at=as_utc(read_at) if read_at is not None else None,
        action=AlertActionWire.model_validate(alert.action) if alert.action else None,
    )


def _profile(db: Session, user_id: str) -> tuple[User, Profile]:
    row = db.execute(
        select(User, Profile)
        .join(Profile, Profile.user_id == User.id)
        .where(User.id == user_id)
    ).one_or_none()
    if row is None:
        raise AppError(
            status_code=404,
            code="PROFILE_NOT_FOUND",
            message="找不到個人資料。",
        )
    return row


def matched_alerts(
    db: Session, user_id: str, unread_only: bool, demo: bool
) -> AlertListWire:
    user, profile = _profile(db, user_id)
    now = utc_now()
    alerts = [
        alert
        for alert in db.scalars(
            select(Alert).order_by(Alert.created_at.desc(), Alert.id)
        )
        if _matches(alert, user, profile, now)
    ]
    reads = {
        item.alert_id: item.read_at
        for item in db.scalars(select(AlertRead).where(AlertRead.user_id == user_id))
    }
    unread_count = sum(alert.id not in reads for alert in alerts)
    if unread_only:
        alerts = [alert for alert in alerts if alert.id not in reads]
    return AlertListWire(
        items=[_alert_wire(alert, reads.get(alert.id)) for alert in alerts],
        unread_count=unread_count,
        demo=demo,
    )


def mark_read(db: Session, user_id: str, alert_id: str) -> AlertWire:
    user, profile = _profile(db, user_id)
    alert = db.get(Alert, alert_id)
    if alert is None or not _matches(alert, user, profile, utc_now()):
        raise AppError(
            status_code=404,
            code="ALERT_NOT_FOUND",
            message="找不到這則通知。",
        )
    read = db.scalar(
        select(AlertRead).where(
            AlertRead.alert_id == alert_id,
            AlertRead.user_id == user_id,
        )
    )
    if read is None:
        read = AlertRead(
            id=new_id("alert_read"),
            alert_id=alert_id,
            user_id=user_id,
            read_at=utc_now(),
        )
        db.add(read)
        db.commit()
    return _alert_wire(alert, read.read_at)
