from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.db.models import MemorySuggestion, Profile, ProfileMemory, User, new_id
from app.schemas.enums import MemorySuggestionStatus
from app.schemas.profiles import MemoryItemWire, ProfilePutRequestWire, ProfileWire
from app.services.common import as_utc, utc_now

MEMORY_PROFILE_FIELDS = {
    "region": ("user", "region"),
    "family_occupation": ("profile", "family_occupation"),
    "family_type": ("profile", "family_type"),
    "economic_status": ("profile", "economic_status"),
}


def _optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _profile_or_error(db: Session, user_id: str) -> tuple[User, Profile]:
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


def memory_item(memory: ProfileMemory) -> MemoryItemWire:
    return MemoryItemWire(
        key=memory.memory_key,
        value=memory.value,
        display_value=memory.display_value,
        source_conversation_id=memory.source_conversation_id,
        created_at=as_utc(memory.created_at),
        updated_at=as_utc(memory.updated_at),
    )


def get_profile(db: Session, user_id: str) -> ProfileWire:
    user, profile = _profile_or_error(db, user_id)
    memories = list(
        db.scalars(
            select(ProfileMemory)
            .where(ProfileMemory.user_id == user_id)
            .order_by(ProfileMemory.updated_at.desc(), ProfileMemory.memory_key)
        )
    )
    timestamps = [as_utc(user.updated_at), as_utc(profile.updated_at)]
    timestamps.extend(as_utc(item.updated_at) for item in memories)
    return ProfileWire(
        user_id=user.id,
        nickname=user.nickname,
        grade=user.grade,
        region=user.region,
        family_occupation=profile.family_occupation,
        family_type=profile.family_type,
        economic_status=profile.economic_status,
        other_identities=list(profile.other_identities or []),
        memories=[memory_item(item) for item in memories],
        updated_at=max(timestamps),
    )


def replace_profile(
    db: Session, user_id: str, body: ProfilePutRequestWire
) -> ProfileWire:
    user, profile = _profile_or_error(db, user_id)
    now = utc_now()
    user.nickname = body.nickname.strip()
    user.grade = body.grade
    user.region = _optional_text(body.region)
    user.updated_at = now
    profile.family_occupation = _optional_text(body.family_occupation)
    profile.family_type = _optional_text(body.family_type)
    profile.economic_status = _optional_text(body.economic_status)
    profile.other_identities = list(body.other_identities)
    profile.updated_at = now
    db.commit()
    return get_profile(db, user_id)


def _write_profile_feature(
    user: User, profile: Profile, key: str, value: str | None, now: datetime
) -> None:
    target = MEMORY_PROFILE_FIELDS.get(key)
    if target is None:
        raise AppError(
            status_code=422,
            code="VALIDATION_ERROR",
            message="這項記憶不能寫入個人資料。",
        )
    owner, attribute = target
    entity = user if owner == "user" else profile
    setattr(entity, attribute, value)
    entity.updated_at = now


def accept_memory(
    db: Session, user_id: str, suggestion_id: str
) -> tuple[MemoryItemWire, bool]:
    suggestion = db.get(MemorySuggestion, suggestion_id)
    if suggestion is None:
        raise AppError(
            status_code=404,
            code="MEMORY_SUGGESTION_NOT_FOUND",
            message="找不到這項記憶建議。",
        )
    if suggestion.user_id != user_id:
        raise AppError(
            status_code=403,
            code="USER_SCOPE_FORBIDDEN",
            message="不能接受其他使用者的記憶建議。",
        )

    accepted = db.scalar(
        select(ProfileMemory).where(
            ProfileMemory.user_id == user_id,
            ProfileMemory.suggestion_id == suggestion.id,
        )
    )
    if suggestion.status == MemorySuggestionStatus.ACCEPTED and accepted is not None:
        return memory_item(accepted), False

    now = utc_now()
    if (
        suggestion.status != MemorySuggestionStatus.PENDING
        or as_utc(suggestion.expires_at) <= now
    ):
        raise AppError(
            status_code=409,
            code="MEMORY_SUGGESTION_EXPIRED",
            message="這項記憶建議已過期。",
        )

    user, profile = _profile_or_error(db, user_id)
    _write_profile_feature(user, profile, suggestion.memory_key, suggestion.value, now)
    existing = db.scalar(
        select(ProfileMemory).where(
            ProfileMemory.user_id == user_id,
            ProfileMemory.memory_key == suggestion.memory_key,
        )
    )
    if existing is None:
        existing = ProfileMemory(
            id=new_id("memory"),
            user_id=user_id,
            memory_key=suggestion.memory_key,
            value=suggestion.value,
            display_value=suggestion.display_value,
            reason=suggestion.reason,
            suggestion_id=suggestion.id,
            source_conversation_id=suggestion.conversation_id,
            consented_at=now,
            created_at=now,
            updated_at=now,
        )
        db.add(existing)
    else:
        existing.value = suggestion.value
        existing.display_value = suggestion.display_value
        existing.reason = suggestion.reason
        existing.suggestion_id = suggestion.id
        existing.source_conversation_id = suggestion.conversation_id
        existing.consented_at = now
        existing.updated_at = now
    suggestion.status = MemorySuggestionStatus.ACCEPTED
    suggestion.accepted_at = now
    db.commit()
    return memory_item(existing), True


def delete_memory(db: Session, user_id: str, key: str) -> None:
    user, profile = _profile_or_error(db, user_id)
    memory = db.scalar(
        select(ProfileMemory).where(
            ProfileMemory.user_id == user_id,
            ProfileMemory.memory_key == key,
        )
    )
    now = utc_now()
    if key in MEMORY_PROFILE_FIELDS:
        _write_profile_feature(user, profile, key, None, now)
    if memory is not None:
        if memory.suggestion_id:
            suggestion = db.get(MemorySuggestion, memory.suggestion_id)
            if suggestion is not None:
                suggestion.status = MemorySuggestionStatus.EXPIRED
        db.delete(memory)
    db.commit()
