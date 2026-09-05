from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import model_validator

from app.schemas.common import (
    Count,
    FilterOptionWire,
    OpaqueId,
    Percentage,
    StrictModel,
)
from app.schemas.enums import GovernmentTopic, LearningSubject, LearningTopic

TeacherPeriodWire = Literal["7d", "30d", "term"]
TeacherClassWire = Literal["all", "801", "802", "803"]
TeacherSubjectWire = Literal["all", "物理", "化學"]
StudentLearningStatusWire = Literal["attention", "steady", "observing", "inactive"]
GovernmentPeriodWire = Literal["7d", "30d", "quarter"]
GovernmentRegionWire = Literal["all", "甲仙", "六龜", "杉林", "美濃", "旗山", "內門"]


class TeacherFiltersWire(StrictModel):
    period: TeacherPeriodWire
    class_id: TeacherClassWire
    subject: TeacherSubjectWire
    attention_threshold: Literal[50, 60, 65, 70]


class TeacherCountsWire(StrictModel):
    question_count: Count
    active_student_count: Count
    roster_student_count: Count
    attention_count: Count
    practice_count: Count
    correct_count: Count
    gap_count: Count
    animation_completed_count: Count
    animation_observation_count: Count
    accuracy_percentage: Percentage | None
    animation_completion_percentage: Percentage | None

    @model_validator(mode="after")
    def validate_denominators(self) -> TeacherCountsWire:
        if self.correct_count > self.practice_count:
            raise ValueError("correct_count cannot exceed practice_count")
        if self.animation_completed_count > self.animation_observation_count:
            raise ValueError(
                "animation_completed_count cannot exceed animation_observation_count"
            )
        if self.practice_count == 0 and self.accuracy_percentage is not None:
            raise ValueError(
                "accuracy_percentage must be null without observed practice"
            )
        if (
            self.animation_observation_count == 0
            and self.animation_completion_percentage is not None
        ):
            raise ValueError("animation completion must be null without observations")
        return self


class TeacherTopicSummaryWire(StrictModel):
    topic: LearningTopic
    title: str
    subject: LearningSubject
    question_count: Count
    practice_count: Count
    correct_count: Count
    gap_count: Count
    student_count: Count
    accuracy_percentage: Percentage | None
    misconception: str
    suggested_activity: str
    suggested_question: str
    duration_minutes: Count

    @model_validator(mode="after")
    def validate_practice_denominator(self) -> TeacherTopicSummaryWire:
        if self.correct_count > self.practice_count:
            raise ValueError("correct_count cannot exceed practice_count")
        if self.practice_count == 0 and self.accuracy_percentage is not None:
            raise ValueError(
                "accuracy_percentage must be null without observed practice"
            )
        return self


class StudentTopicSummaryWire(StrictModel):
    topic: LearningTopic
    title: str
    question_count: Count
    practice_count: Count
    correct_count: Count
    gap_count: Count
    accuracy_percentage: Percentage | None

    @model_validator(mode="after")
    def validate_practice_denominator(self) -> StudentTopicSummaryWire:
        if self.correct_count > self.practice_count:
            raise ValueError("correct_count cannot exceed practice_count")
        if self.practice_count == 0 and self.accuracy_percentage is not None:
            raise ValueError(
                "accuracy_percentage must be null without observed practice"
            )
        return self


class TeacherRosterStudentWire(StrictModel):
    student_id: OpaqueId
    name: str
    class_id: Literal["801", "802", "803"]
    class_label: str
    number: int
    question_count: Count
    practice_count: Count
    correct_count: Count
    accuracy_percentage: Percentage | None
    animation_completed_count: Count
    animation_observation_count: Count
    animation_completion_percentage: Percentage | None
    status: StudentLearningStatusWire
    needs_attention: bool
    main_topic: LearningTopic | None
    topic_summaries: list[StudentTopicSummaryWire]

    @model_validator(mode="after")
    def validate_observation_denominators(self) -> TeacherRosterStudentWire:
        if self.correct_count > self.practice_count:
            raise ValueError("correct_count cannot exceed practice_count")
        if self.animation_completed_count > self.animation_observation_count:
            raise ValueError(
                "animation_completed_count cannot exceed animation_observation_count"
            )
        if self.practice_count == 0 and self.accuracy_percentage is not None:
            raise ValueError(
                "accuracy_percentage must be null without observed practice"
            )
        if (
            self.animation_observation_count == 0
            and self.animation_completion_percentage is not None
        ):
            raise ValueError("animation completion must be null without observations")
        return self


class TeacherTrendPointWire(StrictModel):
    start_date: date
    end_date: date
    label: str
    question_count: Count
    gap_count: Count


class TeacherFilterOptionsWire(StrictModel):
    periods: list[FilterOptionWire]
    classes: list[FilterOptionWire]
    subjects: list[FilterOptionWire]


class TeacherAuthorizedScopeWire(StrictModel):
    school_name: str
    class_ids: list[str]
    label: str


class TeacherDashboardWire(StrictModel):
    as_of: datetime
    demo: bool
    filters: TeacherFiltersWire
    filter_options: TeacherFilterOptionsWire
    authorized_scope: TeacherAuthorizedScopeWire
    summary: TeacherCountsWire
    previous_summary: TeacherCountsWire
    topics: list[TeacherTopicSummaryWire]
    roster: list[TeacherRosterStudentWire]
    trend: list[TeacherTrendPointWire]


class GovernmentCountsWire(StrictModel):
    event_count: Count
    resource_need_count: Count
    potential_need_count: Count
    resource_view_count: Count

    @model_validator(mode="after")
    def validate_count_order(self) -> GovernmentCountsWire:
        if self.resource_need_count > self.event_count:
            raise ValueError("resource_need_count cannot exceed event_count")
        if self.potential_need_count > self.resource_need_count:
            raise ValueError("potential_need_count cannot exceed resource_need_count")
        if self.resource_view_count > self.resource_need_count:
            raise ValueError("resource_view_count cannot exceed resource_need_count")
        return self


class GovernmentTopicAggregateWire(GovernmentCountsWire):
    topic: GovernmentTopic
    label: str
    percentage: Percentage
    education: bool
    previous: GovernmentCountsWire


class GovernmentRegionAggregateWire(GovernmentCountsWire):
    region: Literal["甲仙", "六龜", "杉林", "美濃", "旗山", "內門"]
    label: str
    previous: GovernmentCountsWire


class GovernmentTrendPointWire(GovernmentCountsWire):
    start_date: date
    end_date: date
    label: str
    previous: GovernmentCountsWire


class GovernmentDailyAggregateWire(GovernmentCountsWire):
    date: date
    region: Literal["甲仙", "六龜", "杉林", "美濃", "旗山", "內門"]
    topic: GovernmentTopic


class GovernmentAgentInsightWire(StrictModel):
    title: str
    description: str
    recommendation: str
    topic: GovernmentTopic
    region: GovernmentRegionWire
    direction: Literal["up", "down", "flat"]
    change_percentage: float


class GovernmentFiltersWire(StrictModel):
    period: GovernmentPeriodWire
    region: GovernmentRegionWire
    topic: GovernmentTopic | None


class GovernmentFilterOptionsWire(StrictModel):
    periods: list[FilterOptionWire]
    regions: list[FilterOptionWire]
    topics: list[FilterOptionWire]


class GovernmentWindowWire(StrictModel):
    start_date: date
    end_date: date
    previous_start_date: date
    previous_end_date: date
    days: Count


class GovernmentDashboardWire(StrictModel):
    as_of: datetime
    demo: bool
    filters: GovernmentFiltersWire
    filter_options: GovernmentFilterOptionsWire
    window: GovernmentWindowWire
    totals: GovernmentCountsWire
    previous_totals: GovernmentCountsWire
    topics: list[GovernmentTopicAggregateWire]
    regions: list[GovernmentRegionAggregateWire]
    trend: list[GovernmentTrendPointWire]
    daily_aggregates: list[GovernmentDailyAggregateWire]
    agent_insights: list[GovernmentAgentInsightWire]
