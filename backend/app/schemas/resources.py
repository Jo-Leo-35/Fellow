from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import Field

from app.schemas.common import OpaqueId, StrictModel
from app.schemas.enums import EligibilityStatus, ResourceCategory


class SourceWire(StrictModel):
    source_id: OpaqueId
    source_type: Literal["curriculum", "policy"]
    title: str
    publisher: str | None
    chapter: str | None
    page: str | None
    excerpt: str = Field(min_length=1)
    url: str | None
    query_hint: str | None
    updated_at: datetime | None


class EligibilityCheckWire(StrictModel):
    status: Literal["matched", "needs_confirmation"]
    text: str = Field(min_length=1)


class ResourceProgramWire(StrictModel):
    program_id: OpaqueId
    category: ResourceCategory
    title: str
    agency: str
    summary: str
    eligibility_status: EligibilityStatus | None
    eligibility_checks: list[EligibilityCheckWire]
    reasons: list[str]
    missing_conditions: list[str]
    application_window: str | None
    documents: list[str]
    deadline: date | None
    next_step: str | None
    source_note: str | None
    source_ids: list[OpaqueId]
    sources: list[SourceWire]


class ResourceListWire(StrictModel):
    items: list[ResourceProgramWire]
    demo: bool


class LearningMaterialsWire(StrictModel):
    items: list[SourceWire]
    demo: bool
