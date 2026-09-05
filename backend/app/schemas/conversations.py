from __future__ import annotations

from datetime import datetime

from app.schemas.alerts import AlertWire
from app.schemas.chat import LearningAnswerWire, MemorySuggestionWire
from app.schemas.common import Count, OpaqueId, StrictModel
from app.schemas.enums import ChatMode, MessageRole, ResponseType
from app.schemas.resources import ResourceProgramWire, SourceWire
from app.schemas.uploads import AttachmentWire


class ConversationSummaryWire(StrictModel):
    conversation_id: OpaqueId
    title: str
    mode: ChatMode
    last_response_type: ResponseType | None
    preview: str
    message_count: Count
    created_at: datetime
    updated_at: datetime
    demo: bool


class ConversationListWire(StrictModel):
    items: list[ConversationSummaryWire]
    next_cursor: str | None


class ConversationMessageWire(StrictModel):
    message_id: OpaqueId
    role: MessageRole
    text: str
    attachment_ids: list[OpaqueId]
    attachments: list[AttachmentWire]
    response_type: ResponseType | None
    learning_answer: LearningAnswerWire | None
    resource_recommendation: ResourceProgramWire | None
    memory_suggestion: MemorySuggestionWire | None
    alert: AlertWire | None
    sources: list[SourceWire]
    suggested_follow_ups: list[str]
    created_at: datetime
    demo: bool


class ConversationDetailWire(StrictModel):
    conversation_id: OpaqueId
    user_id: OpaqueId
    title: str
    mode: ChatMode
    created_at: datetime
    updated_at: datetime
    demo: bool
    messages: list[ConversationMessageWire]
