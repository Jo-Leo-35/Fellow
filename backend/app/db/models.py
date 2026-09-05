from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy import (
    Enum as SqlEnum,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, utc_now
from app.schemas.enums import (
    AlertKind,
    ChatMode,
    EligibilityStatus,
    GovernmentTopic,
    IdempotencyStatus,
    InsightType,
    LearningSubject,
    LearningTopic,
    MemorySuggestionStatus,
    MessageRole,
    ReservationStatus,
    ResourceCategory,
    ResponseType,
    Role,
)


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex}"


def enum_type(enum_class: type, name: str) -> SqlEnum:
    return SqlEnum(
        enum_class,
        name=name,
        native_enum=False,
        validate_strings=True,
        values_callable=lambda members: [member.value for member in members],
    )


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )


class User(TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("grade IS NULL OR grade BETWEEN 1 AND 12", name="grade_range"),
    )

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    role: Mapped[Role] = mapped_column(
        enum_type(Role, "role_enum"), nullable=False, index=True
    )
    nickname: Mapped[str] = mapped_column(String(40), nullable=False)
    grade: Mapped[int | None] = mapped_column(Integer)
    region: Mapped[str | None] = mapped_column(String(100), index=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class Profile(TimestampMixin, Base):
    __tablename__ = "profiles"

    id: Mapped[str] = mapped_column(
        String(128), primary_key=True, default=lambda: new_id("profile")
    )
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    family_occupation: Mapped[str | None] = mapped_column(String(100))
    family_type: Mapped[str | None] = mapped_column(String(100))
    economic_status: Mapped[str | None] = mapped_column(String(100))
    other_identities: Mapped[list[str]] = mapped_column(
        JSON, default=list, nullable=False
    )


class Conversation(TimestampMixin, Base):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(
        String(128), primary_key=True, default=lambda: new_id("conv")
    )
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    mode: Mapped[ChatMode] = mapped_column(
        enum_type(ChatMode, "chat_mode_enum"), nullable=False
    )
    category: Mapped[ResourceCategory | None] = mapped_column(
        enum_type(ResourceCategory, "resource_category_enum")
    )
    topic: Mapped[LearningTopic | None] = mapped_column(
        enum_type(LearningTopic, "learning_topic_enum")
    )
    demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (
        UniqueConstraint(
            "conversation_id", "sequence", name="uq_messages_conversation_sequence"
        ),
        CheckConstraint("sequence >= 0", name="sequence_nonnegative"),
    )

    id: Mapped[str] = mapped_column(
        String(128), primary_key=True, default=lambda: new_id("msg")
    )
    conversation_id: Mapped[str] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    role: Mapped[MessageRole] = mapped_column(
        enum_type(MessageRole, "message_role_enum"), nullable=False
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    response_type: Mapped[ResponseType | None] = mapped_column(
        enum_type(ResponseType, "response_type_enum")
    )
    structured_response: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    source_snapshot: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON, default=list, nullable=False
    )
    suggested_follow_ups: Mapped[list[str]] = mapped_column(
        JSON, default=list, nullable=False
    )
    attachment_ids_snapshot: Mapped[list[str]] = mapped_column(
        JSON, default=list, nullable=False
    )
    demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )


class MemorySuggestion(Base):
    __tablename__ = "memory_suggestions"
    __table_args__ = (
        CheckConstraint("length(memory_key) BETWEEN 1 AND 64", name="key_length"),
    )

    id: Mapped[str] = mapped_column(
        String(128), primary_key=True, default=lambda: new_id("suggestion")
    )
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    conversation_id: Mapped[str | None] = mapped_column(
        ForeignKey("conversations.id", ondelete="SET NULL"), index=True
    )
    source_message_id: Mapped[str | None] = mapped_column(
        ForeignKey("messages.id", ondelete="SET NULL"), index=True
    )
    memory_key: Mapped[str] = mapped_column(String(64), nullable=False)
    value: Mapped[str] = mapped_column(String(500), nullable=False)
    display_value: Mapped[str] = mapped_column(String(200), nullable=False)
    reason: Mapped[str | None] = mapped_column(String(500))
    status: Mapped[MemorySuggestionStatus] = mapped_column(
        enum_type(MemorySuggestionStatus, "memory_suggestion_status_enum"),
        default=MemorySuggestionStatus.PENDING,
        nullable=False,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )


class ProfileMemory(TimestampMixin, Base):
    __tablename__ = "profile_memories"
    __table_args__ = (
        UniqueConstraint("user_id", "memory_key", name="uq_profile_memories_user_key"),
        CheckConstraint("length(memory_key) BETWEEN 1 AND 64", name="key_length"),
    )

    id: Mapped[str] = mapped_column(
        String(128), primary_key=True, default=lambda: new_id("memory")
    )
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    memory_key: Mapped[str] = mapped_column(String(64), nullable=False)
    value: Mapped[str] = mapped_column(String(500), nullable=False)
    display_value: Mapped[str] = mapped_column(String(200), nullable=False)
    reason: Mapped[str | None] = mapped_column(String(500))
    suggestion_id: Mapped[str | None] = mapped_column(
        ForeignKey("memory_suggestions.id", ondelete="SET NULL"), unique=True
    )
    source_conversation_id: Mapped[str | None] = mapped_column(
        ForeignKey("conversations.id", ondelete="SET NULL"), index=True
    )
    consented_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )


class CurriculumMaterial(TimestampMixin, Base):
    __tablename__ = "curriculum_materials"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    topic: Mapped[LearningTopic] = mapped_column(
        enum_type(LearningTopic, "curriculum_learning_topic_enum"),
        nullable=False,
        index=True,
    )
    subject: Mapped[LearningSubject] = mapped_column(
        enum_type(LearningSubject, "learning_subject_enum"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    publisher: Mapped[str | None] = mapped_column(String(200))
    chapter: Mapped[str | None] = mapped_column(String(200))
    page: Mapped[str | None] = mapped_column(String(50))
    excerpt: Mapped[str] = mapped_column(Text, nullable=False)
    keywords: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    url: Mapped[str | None] = mapped_column(String(1000))
    query_hint: Mapped[str | None] = mapped_column(String(500))
    source_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    demo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class CurriculumScenario(TimestampMixin, Base):
    __tablename__ = "curriculum_scenarios"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    topic: Mapped[LearningTopic] = mapped_column(
        enum_type(LearningTopic, "scenario_learning_topic_enum"),
        unique=True,
        nullable=False,
    )
    subject: Mapped[LearningSubject] = mapped_column(
        enum_type(LearningSubject, "scenario_learning_subject_enum"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    canonical_question: Mapped[str] = mapped_column(Text, nullable=False)
    keywords: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    answer_payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    demo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class PolicyProgram(TimestampMixin, Base):
    __tablename__ = "policy_programs"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    category: Mapped[ResourceCategory] = mapped_column(
        enum_type(ResourceCategory, "policy_resource_category_enum"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(250), nullable=False)
    agency: Mapped[str] = mapped_column(String(250), nullable=False)
    region: Mapped[str | None] = mapped_column(String(100), index=True)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    default_eligibility_status: Mapped[EligibilityStatus | None] = mapped_column(
        enum_type(EligibilityStatus, "eligibility_status_enum")
    )
    eligibility_checks: Mapped[list[dict[str, str]]] = mapped_column(
        JSON, default=list, nullable=False
    )
    reasons: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    missing_conditions: Mapped[list[str]] = mapped_column(
        JSON, default=list, nullable=False
    )
    application_window: Mapped[str | None] = mapped_column(String(300))
    documents: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    deadline: Mapped[date | None] = mapped_column(Date)
    next_step: Mapped[str | None] = mapped_column(Text)
    source_note: Mapped[str | None] = mapped_column(Text)
    source_excerpt: Mapped[str] = mapped_column(Text, nullable=False)
    source_url: Mapped[str | None] = mapped_column(String(1000))
    query_hint: Mapped[str | None] = mapped_column(String(500))
    source_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    demo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    kind: Mapped[AlertKind] = mapped_column(
        enum_type(AlertKind, "alert_kind_enum"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[ResourceCategory | None] = mapped_column(
        enum_type(ResourceCategory, "alert_resource_category_enum"), index=True
    )
    region: Mapped[str | None] = mapped_column(String(100), index=True)
    target_feature: Mapped[str | None] = mapped_column(String(100), index=True)
    policy_id: Mapped[str | None] = mapped_column(
        ForeignKey("policy_programs.id", ondelete="SET NULL"), index=True
    )
    source_note: Mapped[str | None] = mapped_column(Text)
    action: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    active_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    demo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )


class AlertRead(Base):
    __tablename__ = "alert_reads"
    __table_args__ = (
        UniqueConstraint("alert_id", "user_id", name="uq_alert_reads_alert_user"),
    )

    id: Mapped[str] = mapped_column(
        String(128), primary_key=True, default=lambda: new_id("alert_read")
    )
    alert_id: Mapped[str] = mapped_column(
        ForeignKey("alerts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    read_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class UploadedFile(Base):
    __tablename__ = "uploaded_files"
    __table_args__ = (
        CheckConstraint("size_bytes >= 0", name="size_nonnegative"),
        CheckConstraint(
            "media_type IN ('image/jpeg', 'image/png')", name="allowed_media_type"
        ),
    )

    id: Mapped[str] = mapped_column(
        String(128), primary_key=True, default=lambda: new_id("file")
    )
    owner_user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    media_type: Mapped[str] = mapped_column(String(32), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )


class MessageAttachment(Base):
    __tablename__ = "message_attachments"
    __table_args__ = (
        UniqueConstraint("message_id", "attachment_id", name="uq_message_attachment"),
    )

    id: Mapped[str] = mapped_column(
        String(128), primary_key=True, default=lambda: new_id("msg_file")
    )
    message_id: Mapped[str] = mapped_column(
        ForeignKey("messages.id", ondelete="CASCADE"), nullable=False, index=True
    )
    attachment_id: Mapped[str] = mapped_column(
        ForeignKey("uploaded_files.id", ondelete="RESTRICT"), nullable=False, index=True
    )


class TeacherClass(TimestampMixin, Base):
    __tablename__ = "teacher_classes"
    __table_args__ = (
        UniqueConstraint(
            "teacher_user_id", "class_code", name="uq_teacher_classes_teacher_code"
        ),
    )

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    teacher_user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    school_name: Mapped[str] = mapped_column(String(200), nullable=False)
    class_code: Mapped[str] = mapped_column(String(32), nullable=False)
    class_label: Mapped[str] = mapped_column(String(100), nullable=False)


class RosterStudent(TimestampMixin, Base):
    __tablename__ = "roster_students"
    __table_args__ = (
        UniqueConstraint(
            "class_id", "seat_number", name="uq_roster_students_class_seat"
        ),
    )

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        unique=True,
        nullable=False,
        index=True,
    )
    class_id: Mapped[str] = mapped_column(
        ForeignKey("teacher_classes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    seat_number: Mapped[int] = mapped_column(Integer, nullable=False)


class LearningActivity(Base):
    __tablename__ = "learning_activities"
    __table_args__ = (
        CheckConstraint(
            "practice_correct IS NULL OR practice_correct IN (0, 1)",
            name="practice_correct_boolean",
        ),
        CheckConstraint(
            "animation_completed IS NULL OR animation_completed IN (0, 1)",
            name="animation_completed_boolean",
        ),
    )

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    roster_student_id: Mapped[str] = mapped_column(
        ForeignKey("roster_students.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    message_id: Mapped[str | None] = mapped_column(
        ForeignKey("messages.id", ondelete="SET NULL"), unique=True
    )
    topic: Mapped[LearningTopic] = mapped_column(
        enum_type(LearningTopic, "activity_learning_topic_enum"),
        nullable=False,
        index=True,
    )
    subject: Mapped[LearningSubject] = mapped_column(
        enum_type(LearningSubject, "activity_learning_subject_enum"),
        nullable=False,
        index=True,
    )
    practice_correct: Mapped[bool | None] = mapped_column(Boolean)
    animation_completed: Mapped[bool | None] = mapped_column(Boolean)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    demo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class InsightEvent(Base):
    __tablename__ = "insight_events"
    __table_args__ = (
        CheckConstraint("confidence BETWEEN 0 AND 1", name="confidence_range"),
        CheckConstraint(
            "region IS NULL OR region IN ('甲仙', '六龜', '杉林', '美濃', '旗山', '內門')",
            name="normalized_region",
        ),
        CheckConstraint(
            "event_type IN ('resource_need', 'resource_interest') OR "
            "(potential_need = 0 AND resource_view = 0)",
            name="resource_flags_only_for_resource_events",
        ),
        CheckConstraint(
            "event_type != 'resource_interest' OR resource_view = 1",
            name="interest_records_view",
        ),
        UniqueConstraint("source_kind", "source_reference", name="uq_insight_source"),
    )

    id: Mapped[str] = mapped_column(
        String(128), primary_key=True, default=lambda: new_id("insight")
    )
    message_id: Mapped[str | None] = mapped_column(
        ForeignKey("messages.id", ondelete="SET NULL"), unique=True, index=True
    )
    learning_activity_id: Mapped[str | None] = mapped_column(
        ForeignKey("learning_activities.id", ondelete="SET NULL"),
        unique=True,
        index=True,
    )
    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    region: Mapped[str | None] = mapped_column(String(20), index=True)
    event_type: Mapped[InsightType] = mapped_column(
        enum_type(InsightType, "insight_type_enum"), nullable=False, index=True
    )
    government_topic: Mapped[GovernmentTopic | None] = mapped_column(
        enum_type(GovernmentTopic, "government_topic_enum"), index=True
    )
    learning_topic: Mapped[LearningTopic | None] = mapped_column(
        enum_type(LearningTopic, "insight_learning_topic_enum"), index=True
    )
    resource_category: Mapped[ResourceCategory | None] = mapped_column(
        enum_type(ResourceCategory, "insight_resource_category_enum"), index=True
    )
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    potential_need: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    resource_view: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    source_kind: Mapped[str] = mapped_column(String(50), nullable=False)
    source_reference: Mapped[str] = mapped_column(String(128), nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class DemoPrincipal(TimestampMixin, Base):
    __tablename__ = "demo_principals"
    __table_args__ = (
        CheckConstraint("daily_quota_limit >= 0", name="daily_quota_nonnegative"),
    )

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    config_key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        unique=True,
        nullable=False,
        index=True,
    )
    daily_quota_limit: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id: Mapped[str] = mapped_column(
        String(128), primary_key=True, default=lambda: new_id("session")
    )
    principal_id: Mapped[str] = mapped_column(
        ForeignKey("demo_principals.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class QuotaLedger(TimestampMixin, Base):
    __tablename__ = "quota_ledgers"
    __table_args__ = (
        UniqueConstraint(
            "principal_id", "window_start", name="uq_quota_ledger_principal_window"
        ),
        CheckConstraint("quota_limit >= 0", name="limit_nonnegative"),
        CheckConstraint("used_count >= 0", name="used_nonnegative"),
        CheckConstraint("reserved_count >= 0", name="reserved_nonnegative"),
        CheckConstraint(
            "used_count + reserved_count <= quota_limit", name="within_limit"
        ),
        CheckConstraint("window_end > window_start", name="valid_window"),
    )

    id: Mapped[str] = mapped_column(
        String(128), primary_key=True, default=lambda: new_id("quota")
    )
    principal_id: Mapped[str] = mapped_column(
        ForeignKey("demo_principals.id", ondelete="CASCADE"), nullable=False, index=True
    )
    window_start: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    window_end: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    quota_limit: Mapped[int] = mapped_column(Integer, nullable=False)
    used_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reserved_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class IdempotencyRecord(TimestampMixin, Base):
    __tablename__ = "idempotency_records"
    __table_args__ = (
        UniqueConstraint(
            "principal_id",
            "operation",
            "idempotency_key",
            name="uq_idempotency_principal_operation_key",
        ),
    )

    id: Mapped[str] = mapped_column(
        String(128), primary_key=True, default=lambda: new_id("idem")
    )
    principal_id: Mapped[str] = mapped_column(
        ForeignKey("demo_principals.id", ondelete="CASCADE"), nullable=False, index=True
    )
    operation: Mapped[str] = mapped_column(String(100), nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False)
    request_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[IdempotencyStatus] = mapped_column(
        enum_type(IdempotencyStatus, "idempotency_status_enum"), nullable=False
    )
    response_status: Mapped[int | None] = mapped_column(Integer)
    response_snapshot: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    resource_id: Mapped[str | None] = mapped_column(String(128))
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )


class QuotaReservation(Base):
    __tablename__ = "quota_reservations"
    __table_args__ = (CheckConstraint("amount = 1", name="single_unit"),)

    id: Mapped[str] = mapped_column(
        String(128), primary_key=True, default=lambda: new_id("reservation")
    )
    attempt_id: Mapped[str] = mapped_column(String(128), nullable=False)
    ledger_id: Mapped[str] = mapped_column(
        ForeignKey("quota_ledgers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    idempotency_record_id: Mapped[str] = mapped_column(
        ForeignKey("idempotency_records.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    amount: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[ReservationStatus] = mapped_column(
        enum_type(ReservationStatus, "reservation_status_enum"), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    finalized_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class SystemMetadata(Base):
    __tablename__ = "system_metadata"

    key: Mapped[str] = mapped_column(String(128), primary_key=True)
    value: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )
