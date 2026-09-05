from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import Field, field_validator

from app.schemas.common import OpaqueId, StrictModel


class MemoryItemWire(StrictModel):
    key: str
    value: str
    display_value: str
    source_conversation_id: OpaqueId | None
    created_at: datetime
    updated_at: datetime


class ProfileWire(StrictModel):
    user_id: OpaqueId
    nickname: str
    grade: int | None = Field(ge=1, le=12)
    region: str | None = Field(max_length=100)
    family_occupation: str | None = Field(max_length=100)
    family_type: str | None = Field(max_length=100)
    economic_status: str | None = Field(max_length=100)
    other_identities: list[str]
    memories: list[MemoryItemWire]
    updated_at: datetime


class ProfilePutRequestWire(StrictModel):
    nickname: str = Field(min_length=1, max_length=40)
    grade: int | None = Field(ge=1, le=12)
    region: str | None = Field(max_length=100)
    family_occupation: str | None = Field(max_length=100)
    family_type: str | None = Field(max_length=100)
    economic_status: str | None = Field(max_length=100)
    other_identities: list[str] = Field(max_length=20)

    @field_validator("nickname")
    @classmethod
    def nickname_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("nickname cannot be blank")
        return value

    @field_validator("other_identities")
    @classmethod
    def validate_identities(cls, values: list[str]) -> list[str]:
        cleaned = [value.strip() for value in values]
        if any(not value or len(value) > 80 for value in cleaned):
            raise ValueError("each identity must contain 1..80 characters")
        return cleaned


class MemoryConsentRequestWire(StrictModel):
    suggestion_id: OpaqueId
    consent: Literal[True]

    @field_validator("consent", mode="before")
    @classmethod
    def consent_must_be_json_true(cls, value: object) -> bool:
        if not isinstance(value, bool) or value is not True:
            raise ValueError("consent must be the JSON literal true")
        return value
