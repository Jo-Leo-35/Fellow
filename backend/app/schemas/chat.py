from __future__ import annotations

from datetime import datetime

from pydantic import Field, field_validator, model_validator

from app.schemas.alerts import AlertWire
from app.schemas.auth import UsageWire
from app.schemas.common import OpaqueId, StrictModel
from app.schemas.enums import (
    ChatMode,
    LearningSubject,
    LearningTopic,
    ResourceCategory,
    ResponseType,
)
from app.schemas.resources import ResourceProgramWire, SourceWire


class LearningStepWire(StrictModel):
    title: str
    body: str
    source_ids: list[OpaqueId]


class LearningPracticeWire(StrictModel):
    question: str
    options: list[str] = Field(min_length=2, max_length=6)
    answer_index: int = Field(ge=0)
    explanation: str

    @model_validator(mode="after")
    def answer_must_exist(self) -> LearningPracticeWire:
        if self.answer_index >= len(self.options):
            raise ValueError("answer_index must reference an option")
        return self


class LearningFollowUpWire(StrictModel):
    question: str
    title: str | None


class LearningAnswerWire(StrictModel):
    scenario_id: LearningTopic | None
    animation_topic: LearningTopic | None
    subject: LearningSubject | None
    title: str
    subtitle: str | None
    summary: str
    formula: str | None
    formula_note: str | None
    steps: list[LearningStepWire]
    analogy: str | None
    misconception: str | None
    source_ids: list[OpaqueId]
    practice: LearningPracticeWire | None
    follow_ups: list[LearningFollowUpWire]


class MemorySuggestionWire(StrictModel):
    suggestion_id: OpaqueId
    key: str = Field(min_length=1, max_length=64)
    value: str
    display_value: str
    reason: str | None
    expires_at: datetime


class AgentChatRequestWire(StrictModel):
    user_id: OpaqueId
    conversation_id: OpaqueId | None
    mode: ChatMode
    message: str = Field(max_length=4000)
    attachment_ids: list[OpaqueId] = Field(max_length=3)
    category: ResourceCategory | None = None
    topic: LearningTopic | None = None

    @field_validator("message", mode="before")
    @classmethod
    def trim_message(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @model_validator(mode="after")
    def validate_mode_and_content(self) -> AgentChatRequestWire:
        if not self.message.strip() and not self.attachment_ids:
            raise ValueError("message and attachment_ids cannot both be empty")
        if self.category is not None and self.topic is not None:
            raise ValueError("category and topic cannot both be provided")
        if self.mode == ChatMode.LEARNING and self.category is not None:
            raise ValueError("learning mode cannot include category")
        if self.mode == ChatMode.RESOURCE and self.topic is not None:
            raise ValueError("resource mode cannot include topic")
        return self


class AgentChatResponseWire(StrictModel):
    conversation_id: OpaqueId
    message_id: OpaqueId
    response_type: ResponseType
    text: str
    learning_answer: LearningAnswerWire | None
    resource_recommendation: ResourceProgramWire | None
    memory_suggestion: MemorySuggestionWire | None
    alert: AlertWire | None
    sources: list[SourceWire]
    suggested_follow_ups: list[str]
    created_at: datetime
    demo: bool
    usage: UsageWire

    @model_validator(mode="after")
    def validate_primary_payload_and_sources(self) -> AgentChatResponseWire:
        primary = {
            ResponseType.LEARNING_ANSWER: self.learning_answer,
            ResponseType.RESOURCE_RECOMMENDATION: self.resource_recommendation,
            ResponseType.MEMORY_SUGGESTION: self.memory_suggestion,
            ResponseType.ALERT: self.alert,
        }
        if self.response_type in primary and primary[self.response_type] is None:
            raise ValueError(f"{self.response_type} requires its structured payload")
        if (
            self.response_type != ResponseType.LEARNING_ANSWER
            and self.learning_answer is not None
        ):
            raise ValueError(
                "learning_answer is only valid for a learning_answer response"
            )
        if (
            self.response_type != ResponseType.RESOURCE_RECOMMENDATION
            and self.resource_recommendation is not None
        ):
            raise ValueError(
                "resource_recommendation is only valid for a resource response"
            )
        if self.response_type != ResponseType.ALERT and self.alert is not None:
            raise ValueError("alert is only valid for an alert response")
        if self.memory_suggestion is not None and self.response_type not in {
            ResponseType.LEARNING_ANSWER,
            ResponseType.RESOURCE_RECOMMENDATION,
            ResponseType.MEMORY_SUGGESTION,
        }:
            raise ValueError("memory_suggestion is not valid for this response type")

        available = {source.source_id for source in self.sources}
        referenced: set[str] = set()
        if self.learning_answer:
            referenced.update(self.learning_answer.source_ids)
            for step in self.learning_answer.steps:
                referenced.update(step.source_ids)
        if self.resource_recommendation:
            referenced.update(self.resource_recommendation.source_ids)
            resource_sources = {
                source.source_id for source in self.resource_recommendation.sources
            }
            if not set(self.resource_recommendation.source_ids).issubset(
                resource_sources
            ):
                raise ValueError("resource source_ids must exist in resource.sources")
        if not referenced.issubset(available):
            raise ValueError("every referenced source_id must exist in sources")
        return self
