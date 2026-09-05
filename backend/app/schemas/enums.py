from enum import StrEnum


class Role(StrEnum):
    STUDENT = "student"
    TEACHER = "teacher"
    GOVERNMENT = "government"


class RuntimeMode(StrEnum):
    LIVE = "live"
    OFFLINE_DEMO = "offline_demo"


class ChatMode(StrEnum):
    AUTO = "auto"
    LEARNING = "learning"
    RESOURCE = "resource"


class ResponseType(StrEnum):
    TEXT = "text"
    LEARNING_ANSWER = "learning_answer"
    RESOURCE_RECOMMENDATION = "resource_recommendation"
    MEMORY_SUGGESTION = "memory_suggestion"
    ALERT = "alert"


class InsightType(StrEnum):
    LEARNING_GAP = "learning_gap"
    RESOURCE_NEED = "resource_need"
    RESOURCE_INTEREST = "resource_interest"
    CASUAL = "casual"


class EligibilityStatus(StrEnum):
    ELIGIBLE = "eligible"
    POSSIBLY_ELIGIBLE = "possibly_eligible"
    NEEDS_CONFIRMATION = "needs_confirmation"
    NOT_ELIGIBLE = "not_eligible"


class ResourceCategory(StrEnum):
    DISASTER = "disaster"
    AGRICULTURE = "agriculture"
    EDUCATION = "education"
    ECONOMY = "economy"
    HEALTH = "health"
    OTHER = "other"


class LearningTopic(StrEnum):
    NEWTON = "newton"
    THERMODYNAMICS = "thermodynamics"
    ENTROPY = "entropy"
    EQUILIBRIUM = "equilibrium"
    BONDING = "bonding"
    REACTION_RATE = "reaction-rate"


class LearningSubject(StrEnum):
    PHYSICS = "物理"
    CHEMISTRY = "化學"


class GovernmentTopic(StrEnum):
    AGRICULTURE = "agriculture"
    EDUCATION = "education"
    FINANCIAL = "financial"
    SCIENCE = "science"
    ADMISSION = "admission"
    HEALTH = "health"


class AlertKind(StrEnum):
    CRITICAL = "critical"
    INFORMATION = "information"
    LEARNING = "learning"


class MessageRole(StrEnum):
    USER = "user"
    ASSISTANT = "assistant"


class MemorySuggestionStatus(StrEnum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"


class ReservationStatus(StrEnum):
    RESERVED = "reserved"
    FINALIZED = "finalized"
    RELEASED = "released"


class IdempotencyStatus(StrEnum):
    RESERVED = "reserved"
    COMPLETED = "completed"
    FAILED = "failed"
