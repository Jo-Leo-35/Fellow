from __future__ import annotations

import secrets

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.db.models import DemoPrincipal, Profile, TeacherClass, User
from app.rag.indexer import index_is_ready
from app.schemas.enums import Role


def validate_startup_readiness(db: Session, settings: Settings) -> None:
    """Fail closed when the configured Demo identity or Agent index is unusable."""

    configured = [
        (key, value.get_secret_value())
        for key, value in settings.demo_access_codes.items()
    ]
    if not configured:
        raise RuntimeError(
            "DEMO_ACCESS_CODES must configure at least one Demo identity"
        )
    if any(not key.strip() or not 1 <= len(code) <= 256 for key, code in configured):
        raise RuntimeError("DEMO_ACCESS_CODES contains an invalid key or code length")
    if any(
        secrets.compare_digest(left.encode("utf-8"), right.encode("utf-8"))
        for index, (_key, left) in enumerate(configured)
        for _other_key, right in configured[index + 1 :]
    ):
        raise RuntimeError("DEMO_ACCESS_CODES must map each identity to a unique code")

    rows = db.execute(
        select(DemoPrincipal, User)
        .join(User, User.id == DemoPrincipal.user_id)
        .where(DemoPrincipal.config_key.in_([key for key, _code in configured]))
    ).all()
    if len(rows) != len(configured) or any(
        not principal.enabled for principal, _ in rows
    ):
        raise RuntimeError(
            "DEMO_ACCESS_CODES does not match the enabled seeded Demo principals"
        )
    for principal, user in rows:
        if user.role == Role.STUDENT:
            profile_exists = db.scalar(
                select(func.count(Profile.id)).where(Profile.user_id == user.id)
            )
            if not profile_exists:
                raise RuntimeError("a configured student principal has no profile")
        elif user.role == Role.TEACHER:
            class_count = db.scalar(
                select(func.count(TeacherClass.id)).where(
                    TeacherClass.teacher_user_id == user.id
                )
            )
            if not class_count:
                raise RuntimeError("a configured teacher principal has no class scope")
        elif user.role != Role.GOVERNMENT:
            raise RuntimeError("a configured principal has an unsupported role")
        if principal.user_id != user.id:
            raise RuntimeError("a configured principal identity is inconsistent")

    if not index_is_ready(settings):
        raise RuntimeError(
            "the Agent retrieval index is missing, empty, or incompatible; run build_index.py"
        )
