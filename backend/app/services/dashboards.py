from __future__ import annotations

import math
from collections import defaultdict
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.db.models import (
    CurriculumScenario,
    InsightEvent,
    LearningActivity,
    RosterStudent,
    TeacherClass,
)
from app.schemas.common import FilterOptionWire
from app.schemas.dashboard import (
    GovernmentAgentInsightWire,
    GovernmentCountsWire,
    GovernmentDailyAggregateWire,
    GovernmentDashboardWire,
    GovernmentFilterOptionsWire,
    GovernmentFiltersWire,
    GovernmentRegionAggregateWire,
    GovernmentTopicAggregateWire,
    GovernmentTrendPointWire,
    GovernmentWindowWire,
    StudentTopicSummaryWire,
    TeacherAuthorizedScopeWire,
    TeacherCountsWire,
    TeacherDashboardWire,
    TeacherFilterOptionsWire,
    TeacherFiltersWire,
    TeacherRosterStudentWire,
    TeacherTopicSummaryWire,
    TeacherTrendPointWire,
)
from app.schemas.enums import (
    GovernmentTopic,
    InsightType,
    LearningSubject,
    LearningTopic,
)
from app.services.common import ALLOWED_REGIONS, as_utc, dataset_as_of

TOPIC_LABELS = {
    GovernmentTopic.AGRICULTURE: "農業災損",
    GovernmentTopic.EDUCATION: "就學補助",
    GovernmentTopic.FINANCIAL: "經濟支援",
    GovernmentTopic.SCIENCE: "科學學習",
    GovernmentTopic.ADMISSION: "升學資訊",
    GovernmentTopic.HEALTH: "健康照護",
}
EDUCATION_TOPICS = {
    GovernmentTopic.EDUCATION,
    GovernmentTopic.SCIENCE,
    GovernmentTopic.ADMISSION,
}
TEACHER_PERIOD_LABELS = {"7d": "過去 7 天", "30d": "過去 30 天", "term": "本學期"}
GOVERNMENT_PERIOD_LABELS = {
    "7d": "過去 7 天",
    "30d": "過去 30 天",
    "quarter": "本季至今",
}
TOPIC_DURATION = {
    LearningTopic.NEWTON: 8,
    LearningTopic.THERMODYNAMICS: 10,
    LearningTopic.ENTROPY: 12,
    LearningTopic.EQUILIBRIUM: 8,
    LearningTopic.BONDING: 8,
    LearningTopic.REACTION_RATE: 10,
}


def _day_start(value: date) -> datetime:
    return datetime.combine(value, time.min, timezone.utc)


def _teacher_days(period: str, as_of: datetime) -> int:
    if period == "7d":
        return 7
    if period == "30d":
        return 30
    current = as_of.date()
    if current.month >= 9:
        term_start = date(current.year, 9, 1)
    elif current.month >= 2:
        term_start = date(current.year, 2, 1)
    else:
        term_start = date(current.year - 1, 9, 1)
    return max((current - term_start).days + 1, 1)


def _government_days(period: str, as_of: datetime) -> int:
    if period == "7d":
        return 7
    if period == "30d":
        return 30
    current = as_of.date()
    quarter_month = ((current.month - 1) // 3) * 3 + 1
    return (current - date(current.year, quarter_month, 1)).days + 1


def _window(as_of: datetime, days: int) -> tuple[datetime, datetime, datetime]:
    current_end = _day_start(as_of.date() + timedelta(days=1))
    current_start = current_end - timedelta(days=days)
    previous_start = current_start - timedelta(days=days)
    return previous_start, current_start, current_end


def _percentage(numerator: int, denominator: int) -> float | None:
    if denominator == 0:
        return None
    return round(numerator / denominator * 100, 1)


def _teacher_counts(
    rows: list[tuple[LearningActivity, RosterStudent, TeacherClass]],
    gap_activity_ids: set[str],
    roster_count: int,
    attention_threshold: int,
) -> TeacherCountsWire:
    practice = sum(activity.practice_correct is not None for activity, _, _ in rows)
    correct = sum(activity.practice_correct is True for activity, _, _ in rows)
    animation_observations = sum(
        activity.animation_completed is not None for activity, _, _ in rows
    )
    animation_completed = sum(
        activity.animation_completed is True for activity, _, _ in rows
    )
    by_student: dict[str, list[LearningActivity]] = defaultdict(list)
    for activity, roster, _teacher_class in rows:
        by_student[roster.id].append(activity)
    attention = 0
    for activities in by_student.values():
        student_practice = sum(item.practice_correct is not None for item in activities)
        student_correct = sum(item.practice_correct is True for item in activities)
        student_gaps = sum(item.id in gap_activity_ids for item in activities)
        accuracy = _percentage(student_correct, student_practice)
        if student_gaps > 0 or (
            student_practice >= 3
            and accuracy is not None
            and accuracy < attention_threshold
        ):
            attention += 1
    return TeacherCountsWire(
        question_count=len(rows),
        active_student_count=len(by_student),
        roster_student_count=roster_count,
        attention_count=attention,
        practice_count=practice,
        correct_count=correct,
        gap_count=sum(activity.id in gap_activity_ids for activity, _, _ in rows),
        animation_completed_count=animation_completed,
        animation_observation_count=animation_observations,
        accuracy_percentage=_percentage(correct, practice),
        animation_completion_percentage=_percentage(
            animation_completed, animation_observations
        ),
    )


def _student_status(
    questions: int,
    practice: int,
    accuracy: float | None,
    gaps: int,
    threshold: int,
) -> tuple[str, bool]:
    attention = gaps > 0 or (
        practice >= 3 and accuracy is not None and accuracy < threshold
    )
    if attention:
        return "attention", True
    if questions == 0:
        return "inactive", False
    if practice < 3:
        return "observing", False
    return "steady", False


def _topic_metadata(db: Session) -> dict[LearningTopic, CurriculumScenario]:
    return {
        item.topic: item
        for item in db.scalars(
            select(CurriculumScenario).order_by(CurriculumScenario.topic)
        )
    }


def teacher_dashboard(
    db: Session,
    teacher_user_id: str,
    runtime_mode: str,
    period: str,
    class_id: str,
    subject: str,
    attention_threshold: int,
) -> TeacherDashboardWire:
    authorized_classes = list(
        db.scalars(
            select(TeacherClass)
            .where(TeacherClass.teacher_user_id == teacher_user_id)
            .order_by(TeacherClass.class_code)
        )
    )
    authorized_codes = {item.class_code for item in authorized_classes}
    if not authorized_classes:
        raise AppError(
            status_code=403,
            code="FORBIDDEN",
            message="這個教師身份沒有已授權班級。",
        )
    if class_id != "all" and class_id not in authorized_codes:
        raise AppError(
            status_code=403,
            code="FORBIDDEN",
            message="不能查看未授權的班級。",
        )

    selected_codes = authorized_codes if class_id == "all" else {class_id}
    selected_classes = [
        item for item in authorized_classes if item.class_code in selected_codes
    ]
    selected_class_ids = {item.id for item in selected_classes}
    roster = list(
        db.scalars(
            select(RosterStudent)
            .where(RosterStudent.class_id.in_(selected_class_ids))
            .order_by(RosterStudent.class_id, RosterStudent.seat_number)
        )
    )
    class_by_id = {item.id: item for item in selected_classes}

    as_of = dataset_as_of(db, runtime_mode)
    days = _teacher_days(period, as_of)
    previous_start, current_start, current_end = _window(as_of, days)
    activity_statement = (
        select(LearningActivity, RosterStudent, TeacherClass)
        .join(RosterStudent, RosterStudent.id == LearningActivity.roster_student_id)
        .join(TeacherClass, TeacherClass.id == RosterStudent.class_id)
        .where(
            TeacherClass.teacher_user_id == teacher_user_id,
            TeacherClass.class_code.in_(selected_codes),
            LearningActivity.occurred_at >= previous_start,
            LearningActivity.occurred_at < current_end,
        )
    )
    if subject != "all":
        activity_statement = activity_statement.where(
            LearningActivity.subject == subject
        )
    all_rows = list(db.execute(activity_statement))
    current_rows = [
        row for row in all_rows if as_utc(row[0].occurred_at) >= current_start
    ]
    previous_rows = [
        row for row in all_rows if as_utc(row[0].occurred_at) < current_start
    ]
    relevant_ids = {row[0].id for row in all_rows}
    gap_activity_ids: set[str] = set()
    if relevant_ids:
        gap_activity_ids = set(
            db.scalars(
                select(InsightEvent.learning_activity_id).where(
                    InsightEvent.event_type == InsightType.LEARNING_GAP,
                    InsightEvent.learning_activity_id.in_(relevant_ids),
                    InsightEvent.occurred_at >= previous_start,
                    InsightEvent.occurred_at < current_end,
                )
            )
        )
    current_gap_ids = {
        item_id
        for item_id in gap_activity_ids
        if any(row[0].id == item_id for row in current_rows)
    }
    previous_gap_ids = gap_activity_ids - current_gap_ids

    metadata = _topic_metadata(db)
    allowed_topics = [
        topic
        for topic in LearningTopic
        if subject == "all"
        or (topic in metadata and metadata[topic].subject.value == subject)
    ]
    topics: list[TeacherTopicSummaryWire] = []
    for topic in allowed_topics:
        topic_rows = [row for row in current_rows if row[0].topic == topic]
        practice = sum(row[0].practice_correct is not None for row in topic_rows)
        correct = sum(row[0].practice_correct is True for row in topic_rows)
        scenario = metadata.get(topic)
        answer = scenario.answer_payload if scenario else {}
        topics.append(
            TeacherTopicSummaryWire(
                topic=topic,
                title=scenario.title if scenario else topic.value,
                subject=scenario.subject if scenario else LearningSubject.PHYSICS,
                question_count=len(topic_rows),
                practice_count=practice,
                correct_count=correct,
                gap_count=sum(row[0].id in current_gap_ids for row in topic_rows),
                student_count=len({row[1].id for row in topic_rows}),
                accuracy_percentage=_percentage(correct, practice),
                misconception=str(
                    answer.get("misconception") or "目前沒有已記錄的迷思說明。"
                ),
                suggested_activity=f"搭配「{scenario.title if scenario else topic.value}」教材、步驟與練習題進行複習。",
                suggested_question=scenario.canonical_question
                if scenario
                else "請說明你的推理過程。",
                duration_minutes=TOPIC_DURATION[topic],
            )
        )
    topics.sort(key=lambda item: (-item.gap_count, -item.question_count, item.topic))

    rows_by_student: dict[
        str, list[tuple[LearningActivity, RosterStudent, TeacherClass]]
    ] = defaultdict(list)
    for row in current_rows:
        rows_by_student[row[1].id].append(row)
    roster_items: list[TeacherRosterStudentWire] = []
    for student in roster:
        student_rows = rows_by_student.get(student.id, [])
        practice = sum(row[0].practice_correct is not None for row in student_rows)
        correct = sum(row[0].practice_correct is True for row in student_rows)
        animation_observations = sum(
            row[0].animation_completed is not None for row in student_rows
        )
        animation_completed = sum(
            row[0].animation_completed is True for row in student_rows
        )
        gaps = sum(row[0].id in current_gap_ids for row in student_rows)
        accuracy = _percentage(correct, practice)
        status, needs_attention = _student_status(
            len(student_rows), practice, accuracy, gaps, attention_threshold
        )
        student_topics: list[StudentTopicSummaryWire] = []
        for topic in allowed_topics:
            topic_rows = [row for row in student_rows if row[0].topic == topic]
            if not topic_rows:
                continue
            topic_practice = sum(
                row[0].practice_correct is not None for row in topic_rows
            )
            topic_correct = sum(row[0].practice_correct is True for row in topic_rows)
            student_topics.append(
                StudentTopicSummaryWire(
                    topic=topic,
                    title=metadata[topic].title if topic in metadata else topic.value,
                    question_count=len(topic_rows),
                    practice_count=topic_practice,
                    correct_count=topic_correct,
                    gap_count=sum(row[0].id in current_gap_ids for row in topic_rows),
                    accuracy_percentage=_percentage(topic_correct, topic_practice),
                )
            )
        student_topics.sort(
            key=lambda item: (-item.gap_count, -item.question_count, item.topic)
        )
        roster_items.append(
            TeacherRosterStudentWire(
                student_id=student.id,
                name=student.name,
                class_id=class_by_id[student.class_id].class_code,
                class_label=class_by_id[student.class_id].class_label,
                number=student.seat_number,
                question_count=len(student_rows),
                practice_count=practice,
                correct_count=correct,
                accuracy_percentage=accuracy,
                animation_completed_count=animation_completed,
                animation_observation_count=animation_observations,
                animation_completion_percentage=_percentage(
                    animation_completed, animation_observations
                ),
                status=status,
                needs_attention=needs_attention,
                main_topic=student_topics[0].topic if student_topics else None,
                topic_summaries=student_topics,
            )
        )

    bucket_size = max(1, math.ceil(days / (7 if days <= 7 else 8)))
    trend: list[TeacherTrendPointWire] = []
    bucket_start = current_start
    while bucket_start < current_end:
        bucket_end = min(bucket_start + timedelta(days=bucket_size), current_end)
        bucket_rows = [
            row
            for row in current_rows
            if bucket_start <= as_utc(row[0].occurred_at) < bucket_end
        ]
        trend.append(
            TeacherTrendPointWire(
                start_date=bucket_start.date(),
                end_date=(bucket_end - timedelta(days=1)).date(),
                label=bucket_start.strftime("%m/%d"),
                question_count=len(bucket_rows),
                gap_count=sum(row[0].id in current_gap_ids for row in bucket_rows),
            )
        )
        bucket_start = bucket_end

    school_names = sorted({item.school_name for item in authorized_classes})
    return TeacherDashboardWire(
        as_of=as_of,
        demo=runtime_mode == "offline_demo",
        filters=TeacherFiltersWire(
            period=period,
            class_id=class_id,
            subject=subject,
            attention_threshold=attention_threshold,
        ),
        filter_options=TeacherFilterOptionsWire(
            periods=[
                FilterOptionWire(id=item, label=label)
                for item, label in TEACHER_PERIOD_LABELS.items()
            ],
            classes=[FilterOptionWire(id="all", label="全部班級")]
            + [
                FilterOptionWire(id=item.class_code, label=item.class_label)
                for item in authorized_classes
            ],
            subjects=[
                FilterOptionWire(id="all", label="全部科目"),
                FilterOptionWire(id="物理", label="物理"),
                FilterOptionWire(id="化學", label="化學"),
            ],
        ),
        authorized_scope=TeacherAuthorizedScopeWire(
            school_name="、".join(school_names),
            class_ids=sorted(authorized_codes),
            label=f"{'、'.join(school_names)}／{'、'.join(sorted(authorized_codes))}",
        ),
        summary=_teacher_counts(
            current_rows, current_gap_ids, len(roster), attention_threshold
        ),
        previous_summary=_teacher_counts(
            previous_rows, previous_gap_ids, len(roster), attention_threshold
        ),
        topics=topics,
        roster=roster_items,
        trend=trend,
    )


@dataclass(frozen=True, slots=True)
class GovernmentAggregateRow:
    date: date
    region: str
    topic: GovernmentTopic
    event_count: int
    resource_need_count: int
    potential_need_count: int
    resource_view_count: int


def _government_counts(
    rows: Iterable[GovernmentAggregateRow],
) -> GovernmentCountsWire:
    items = list(rows)
    return GovernmentCountsWire(
        event_count=sum(item.event_count for item in items),
        resource_need_count=sum(item.resource_need_count for item in items),
        potential_need_count=sum(item.potential_need_count for item in items),
        resource_view_count=sum(item.resource_view_count for item in items),
    )


def _government_aggregate_rows(
    db: Session,
    *,
    start: datetime,
    end: datetime,
    region: str,
    topic: GovernmentTopic | None,
) -> list[GovernmentAggregateRow]:
    event_date = func.date(InsightEvent.occurred_at)
    resource_event_types = (
        InsightType.RESOURCE_NEED,
        InsightType.RESOURCE_INTEREST,
    )
    statement = select(
        event_date.label("aggregate_date"),
        InsightEvent.region.label("aggregate_region"),
        InsightEvent.government_topic.label("aggregate_topic"),
        func.count().label("event_count"),
        func.sum(
            case((InsightEvent.event_type.in_(resource_event_types), 1), else_=0)
        ).label("resource_need_count"),
        func.sum(case((InsightEvent.potential_need.is_(True), 1), else_=0)).label(
            "potential_need_count"
        ),
        func.sum(case((InsightEvent.resource_view.is_(True), 1), else_=0)).label(
            "resource_view_count"
        ),
    ).where(
        InsightEvent.occurred_at >= start,
        InsightEvent.occurred_at < end,
        InsightEvent.region.in_(ALLOWED_REGIONS),
        InsightEvent.government_topic.in_(list(GovernmentTopic)),
    )
    if region != "all":
        statement = statement.where(InsightEvent.region == region)
    if topic is not None:
        statement = statement.where(InsightEvent.government_topic == topic)
    statement = statement.group_by(
        event_date,
        InsightEvent.region,
        InsightEvent.government_topic,
    ).order_by(
        event_date,
        InsightEvent.region,
        InsightEvent.government_topic,
    )
    rows = db.execute(statement).all()
    return [
        GovernmentAggregateRow(
            date=row.aggregate_date
            if isinstance(row.aggregate_date, date)
            else date.fromisoformat(row.aggregate_date),
            region=row.aggregate_region,
            topic=GovernmentTopic(row.aggregate_topic),
            event_count=int(row.event_count or 0),
            resource_need_count=int(row.resource_need_count or 0),
            potential_need_count=int(row.potential_need_count or 0),
            resource_view_count=int(row.resource_view_count or 0),
        )
        for row in rows
    ]


def _normalized_shares(counts: list[int]) -> list[float]:
    total = sum(counts)
    if total == 0:
        return [0.0 for _ in counts]
    raw = [value / total * 1000 for value in counts]
    rounded = [math.floor(value) for value in raw]
    remainder = 1000 - sum(rounded)
    order = sorted(
        range(len(raw)), key=lambda index: raw[index] - rounded[index], reverse=True
    )
    for index in order[:remainder]:
        rounded[index] += 1
    return [value / 10 for value in rounded]


def _change(current: int, previous: int) -> tuple[str, float]:
    if current == previous:
        return "flat", 0.0
    if previous == 0:
        return ("up" if current > 0 else "down"), 100.0
    value = (current - previous) / previous * 100
    return ("up" if value > 0 else "down"), round(abs(value), 1)


def government_dashboard(
    db: Session,
    runtime_mode: str,
    period: str,
    region: str,
    topic: GovernmentTopic | None,
) -> GovernmentDashboardWire:
    as_of = dataset_as_of(db, runtime_mode)
    days = _government_days(period, as_of)
    previous_start, current_start, current_end = _window(as_of, days)
    rows = _government_aggregate_rows(
        db,
        start=previous_start,
        end=current_end,
        region=region,
        topic=topic,
    )
    current = [item for item in rows if item.date >= current_start.date()]
    previous = [item for item in rows if item.date < current_start.date()]
    totals = _government_counts(current)
    previous_totals = _government_counts(previous)

    topic_current = {
        item: [row for row in current if row.topic == item] for item in GovernmentTopic
    }
    topic_previous = {
        item: [row for row in previous if row.topic == item] for item in GovernmentTopic
    }
    current_topic_counts = [
        _government_counts(topic_current[item]) for item in GovernmentTopic
    ]
    shares = _normalized_shares(
        [item.resource_need_count for item in current_topic_counts]
    )
    topics = [
        GovernmentTopicAggregateWire(
            **counts.model_dump(),
            topic=item,
            label=TOPIC_LABELS[item],
            percentage=shares[index],
            education=item in EDUCATION_TOPICS,
            previous=_government_counts(topic_previous[item]),
        )
        for index, (item, counts) in enumerate(
            zip(GovernmentTopic, current_topic_counts)
        )
    ]
    topics.sort(
        key=lambda item: (-item.resource_need_count, -item.event_count, item.topic)
    )

    selected_regions = ALLOWED_REGIONS if region == "all" else (region,)
    regions = [
        GovernmentRegionAggregateWire(
            **_government_counts(
                row for row in current if row.region == selected_region
            ).model_dump(),
            region=selected_region,
            label=f"{selected_region}區",
            previous=_government_counts(
                row for row in previous if row.region == selected_region
            ),
        )
        for selected_region in selected_regions
    ]
    regions.sort(
        key=lambda item: (-item.resource_need_count, -item.event_count, item.region)
    )

    daily = [
        GovernmentDailyAggregateWire(
            event_count=item.event_count,
            resource_need_count=item.resource_need_count,
            potential_need_count=item.potential_need_count,
            resource_view_count=item.resource_view_count,
            date=item.date,
            region=item.region,
            topic=item.topic,
        )
        for item in current
    ]

    bucket_size = max(1, math.ceil(days / (7 if period == "7d" else 8)))
    trend: list[GovernmentTrendPointWire] = []
    bucket_start = current_start
    while bucket_start < current_end:
        bucket_end = min(bucket_start + timedelta(days=bucket_size), current_end)
        prior_start = bucket_start - timedelta(days=days)
        prior_end = bucket_end - timedelta(days=days)
        trend.append(
            GovernmentTrendPointWire(
                **_government_counts(
                    row
                    for row in current
                    if bucket_start.date() <= row.date < bucket_end.date()
                ).model_dump(),
                start_date=bucket_start.date(),
                end_date=(bucket_end - timedelta(days=1)).date(),
                label=bucket_start.strftime("%m/%d"),
                previous=_government_counts(
                    row
                    for row in previous
                    if prior_start.date() <= row.date < prior_end.date()
                ),
            )
        )
        bucket_start = bucket_end

    ranked = sorted(
        topics,
        key=lambda item: (
            -item.resource_need_count,
            -item.event_count,
            item.topic,
        ),
    )
    insights: list[GovernmentAgentInsightWire] = []
    if ranked and (ranked[0].event_count > 0 or ranked[0].previous.event_count > 0):
        leading = ranked[0]
        current_metric = (
            leading.resource_need_count
            if leading.resource_need_count or leading.previous.resource_need_count
            else leading.event_count
        )
        previous_metric = (
            leading.previous.resource_need_count
            if leading.resource_need_count or leading.previous.resource_need_count
            else leading.previous.event_count
        )
        direction, change_percentage = _change(current_metric, previous_metric)
        direction_label = {"up": "增加", "down": "減少", "flat": "持平"}[direction]
        scope_label = "六區" if region == "all" else f"{region}區"
        insights.append(
            GovernmentAgentInsightWire(
                title=f"{leading.label}訊號{direction_label}",
                description=f"本期 {scope_label}彙整到 {current_metric} 筆相關訊號，前期為 {previous_metric} 筆。",
                recommendation="請以彙整趨勢檢視資訊曝光與服務窗口，不以此統計直接判定個人資格。",
                topic=leading.topic,
                region=region,
                direction=direction,
                change_percentage=change_percentage,
            )
        )

    return GovernmentDashboardWire(
        as_of=as_of,
        demo=runtime_mode == "offline_demo",
        filters=GovernmentFiltersWire(period=period, region=region, topic=topic),
        filter_options=GovernmentFilterOptionsWire(
            periods=[
                FilterOptionWire(id=item, label=label)
                for item, label in GOVERNMENT_PERIOD_LABELS.items()
            ],
            regions=[FilterOptionWire(id="all", label="高雄六區")]
            + [
                FilterOptionWire(id=item, label=f"{item}區") for item in ALLOWED_REGIONS
            ],
            topics=[
                FilterOptionWire(id=item.value, label=TOPIC_LABELS[item])
                for item in GovernmentTopic
            ],
        ),
        window=GovernmentWindowWire(
            start_date=current_start.date(),
            end_date=(current_end - timedelta(days=1)).date(),
            previous_start_date=previous_start.date(),
            previous_end_date=(current_start - timedelta(days=1)).date(),
            days=days,
        ),
        totals=totals,
        previous_totals=previous_totals,
        topics=topics,
        regions=regions,
        trend=trend,
        daily_aggregates=daily,
        agent_insights=insights,
    )
