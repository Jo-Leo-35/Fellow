from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import (
    Conversation,
    InsightEvent,
    LearningActivity,
    Message,
    RosterStudent,
    User,
    new_id,
)
from app.schemas.enums import (
    EligibilityStatus,
    GovernmentTopic,
    InsightType,
    LearningSubject,
    LearningTopic,
    MessageRole,
    ResourceCategory,
)
from app.services.common import normalize_region

RESOURCE_TOPIC_MAP = {
    ResourceCategory.AGRICULTURE: GovernmentTopic.AGRICULTURE,
    ResourceCategory.DISASTER: GovernmentTopic.FINANCIAL,
    ResourceCategory.EDUCATION: GovernmentTopic.EDUCATION,
    ResourceCategory.ECONOMY: GovernmentTopic.FINANCIAL,
    ResourceCategory.HEALTH: GovernmentTopic.HEALTH,
}


@dataclass(frozen=True, slots=True)
class InsightProjection:
    event_type: InsightType
    government_topic: GovernmentTopic | None
    learning_topic: LearningTopic | None
    resource_category: ResourceCategory | None
    potential_need: bool = False
    resource_view: bool = False


def learning_gap_projection(topic: LearningTopic) -> InsightProjection:
    return InsightProjection(
        event_type=InsightType.LEARNING_GAP,
        government_topic=GovernmentTopic.SCIENCE,
        learning_topic=topic,
        resource_category=None,
    )


def resource_projection(
    event_type: InsightType,
    category: ResourceCategory,
    eligibility_status: EligibilityStatus | None,
    *,
    admission: bool = False,
    other_is_social_support: bool = False,
) -> InsightProjection:
    if event_type not in {InsightType.RESOURCE_NEED, InsightType.RESOURCE_INTEREST}:
        raise ValueError("resource projection requires a resource insight type")
    government_topic = RESOURCE_TOPIC_MAP.get(category)
    if admission and category == ResourceCategory.EDUCATION:
        government_topic = GovernmentTopic.ADMISSION
    elif category == ResourceCategory.OTHER and other_is_social_support:
        government_topic = GovernmentTopic.FINANCIAL
    return InsightProjection(
        event_type=event_type,
        government_topic=government_topic,
        learning_topic=None,
        resource_category=category,
        potential_need=event_type == InsightType.RESOURCE_NEED
        and eligibility_status
        in {
            EligibilityStatus.POSSIBLY_ELIGIBLE,
            EligibilityStatus.NEEDS_CONFIRMATION,
        },
        resource_view=event_type == InsightType.RESOURCE_INTEREST,
    )


def record_learning_question(
    db: Session,
    *,
    conversation: Conversation,
    assistant_message: Message,
    user: User,
    topic: LearningTopic,
    subject: LearningSubject,
) -> LearningActivity | None:
    _validate_message_owner(conversation, assistant_message, user)
    roster_student = db.scalar(
        select(RosterStudent).where(RosterStudent.user_id == user.id)
    )
    if roster_student is None:
        return None
    activity = LearningActivity(
        id=new_id("learning"),
        roster_student_id=roster_student.id,
        message_id=assistant_message.id,
        topic=topic,
        subject=subject,
        practice_correct=None,
        animation_completed=None,
        occurred_at=assistant_message.created_at,
        demo=assistant_message.demo,
    )
    db.add(activity)
    return activity


def record_primary_insight(
    db: Session,
    *,
    conversation: Conversation,
    assistant_message: Message,
    user: User,
    projection: InsightProjection,
    confidence: float,
    learning_activity: LearningActivity | None = None,
) -> InsightEvent:
    _validate_message_owner(conversation, assistant_message, user)
    if not 0 <= confidence <= 1:
        raise ValueError("insight confidence must be between 0 and 1")
    event = InsightEvent(
        id=new_id("insight"),
        message_id=assistant_message.id,
        learning_activity_id=learning_activity.id if learning_activity else None,
        user_id=user.id,
        region=normalize_region(user.region),
        event_type=projection.event_type,
        government_topic=projection.government_topic,
        learning_topic=projection.learning_topic,
        resource_category=projection.resource_category,
        confidence=confidence,
        potential_need=projection.potential_need,
        resource_view=projection.resource_view,
        source_kind="assistant_message",
        source_reference=assistant_message.id,
        occurred_at=assistant_message.created_at,
        demo=assistant_message.demo,
    )
    db.add(event)
    return event


def _validate_message_owner(
    conversation: Conversation, assistant_message: Message, user: User
) -> None:
    if (
        conversation.user_id != user.id
        or assistant_message.conversation_id != conversation.id
        or assistant_message.role != MessageRole.ASSISTANT
    ):
        raise ValueError(
            "assistant message, conversation and authenticated owner disagree"
        )
