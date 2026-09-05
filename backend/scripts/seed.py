# ruff: noqa: I001
from __future__ import annotations

import argparse
import json
import os
import sys
from collections.abc import Iterable
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from typing import Any, TypedDict

from sqlalchemy import func, select
from sqlalchemy.orm import Session


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import Settings
from app.db.database import Database
from app.db.models import (
    Alert,
    AlertRead,
    Conversation,
    CurriculumMaterial,
    CurriculumScenario,
    DemoPrincipal,
    InsightEvent,
    LearningActivity,
    MemorySuggestion,
    Message,
    PolicyProgram,
    Profile,
    ProfileMemory,
    RosterStudent,
    SystemMetadata,
    TeacherClass,
    User,
)
from app.schemas.chat import LearningAnswerWire, MemorySuggestionWire
from app.schemas.conversations import ConversationMessageWire
from app.schemas.resources import ResourceProgramWire, SourceWire


MUTABLE_SEED_KEY = "demo_seed_v1_mutable_complete"
ANCHOR_KEY = "demo_seed_v1_anchor"
SCHOOL_NAME = "學伴 Demo 國中"
DISTRICTS = ["甲仙", "六龜", "杉林", "美濃", "旗山", "內門"]
TOPICS = [
    "newton",
    "thermodynamics",
    "entropy",
    "equilibrium",
    "bonding",
    "reaction-rate",
]
SUBJECT_BY_TOPIC = {
    "newton": "物理",
    "thermodynamics": "物理",
    "entropy": "物理",
    "equilibrium": "化學",
    "bonding": "化學",
    "reaction-rate": "化學",
}


class SeededAssistant(TypedDict):
    message_id: str
    user_id: str
    created_at: datetime
    response_type: str
    topic: str | None
    category: str | None
    structured_response: dict[str, Any]


FICTIONAL_NAMES = [
    "陳予安",
    "林映禾",
    "張知行",
    "黃以晴",
    "李沐恩",
    "吳承遠",
    "劉星禾",
    "蔡語澄",
    "楊子岳",
    "許若庭",
    "鄭書恆",
    "謝雨彤",
    "郭品澄",
    "洪宥辰",
    "陳思齊",
    "林柏言",
    "張念初",
    "黃可晴",
    "李向晨",
    "吳以樂",
    "劉奕安",
    "蔡千尋",
    "楊知夏",
    "許亦凡",
    "鄭禾安",
    "謝沛文",
    "郭初晴",
    "洪景澄",
    "陳允希",
    "林之恆",
    "張若白",
    "黃奕辰",
    "李映彤",
    "吳書言",
    "劉星宇",
    "蔡予晴",
    "楊沐晨",
    "許念慈",
    "鄭以安",
    "謝知恩",
    "郭晨希",
    "洪語禾",
]


def load_json(relative_path: str) -> list[dict[str, Any]]:
    path = BACKEND_ROOT / "data" / relative_path
    with path.open(encoding="utf-8") as handle:
        value = json.load(handle)
    if not isinstance(value, list):
        raise TypeError(f"seed data must be a JSON array: {path}")
    return value


def add_if_missing(session: Session, model: type, object_id: str, **values: Any) -> Any:
    existing = session.get(model, object_id)
    if existing is not None:
        return existing
    item = model(id=object_id, **values)
    session.add(item)
    return item


def curriculum_source(material: dict[str, Any]) -> dict[str, Any]:
    return SourceWire(
        source_id=material["id"],
        source_type="curriculum",
        title=material["title"],
        publisher=material.get("publisher"),
        chapter=material.get("chapter"),
        page=material.get("page"),
        excerpt=material["excerpt"],
        url=None,
        query_hint=None,
        updated_at=None,
    ).model_dump(mode="json")


def policy_source(policy: dict[str, Any]) -> dict[str, Any]:
    return SourceWire(
        source_id=f"policy-source-{policy['id']}",
        source_type="policy",
        title=policy["title"],
        publisher=policy["agency"],
        chapter=None,
        page=None,
        excerpt=policy["source_excerpt"],
        url=policy.get("source_url"),
        query_hint=policy.get("query_hint"),
        updated_at=policy.get("source_updated_at"),
    ).model_dump(mode="json")


def policy_payload(policy: dict[str, Any]) -> dict[str, Any]:
    source = policy_source(policy)
    return ResourceProgramWire(
        program_id=policy["id"],
        category=policy["category"],
        title=policy["title"],
        agency=policy["agency"],
        summary=policy["summary"],
        eligibility_status=policy.get("default_eligibility_status"),
        eligibility_checks=policy["eligibility_checks"],
        reasons=policy["reasons"],
        missing_conditions=policy["missing_conditions"],
        application_window=policy.get("application_window"),
        documents=policy["documents"],
        deadline=policy.get("deadline"),
        next_step=policy.get("next_step"),
        source_note=policy.get("source_note"),
        source_ids=[source["source_id"]],
        sources=[source],
    ).model_dump(mode="json")


def seed_catalogs(
    session: Session,
    anchor: datetime,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    materials = load_json("curriculum/materials.json")
    scenarios = load_json("curriculum/scenarios.json")
    policies = load_json("policies/programs.json")
    alerts = load_json("alerts/alerts.json")

    for material in materials:
        add_if_missing(
            session,
            CurriculumMaterial,
            material["id"],
            topic=material["topic"],
            subject=material["subject"],
            title=material["title"],
            publisher=material.get("publisher"),
            chapter=material.get("chapter"),
            page=material.get("page"),
            excerpt=material["excerpt"],
            keywords=material["keywords"],
            url=None,
            query_hint=None,
            source_updated_at=None,
            demo=True,
        )

    for scenario in scenarios:
        answer = LearningAnswerWire.model_validate(scenario["answer_payload"])
        add_if_missing(
            session,
            CurriculumScenario,
            scenario["id"],
            topic=scenario["topic"],
            subject=scenario["subject"],
            title=scenario["title"],
            canonical_question=scenario["canonical_question"],
            keywords=scenario["keywords"],
            answer_payload=answer.model_dump(mode="json"),
            demo=True,
        )

    for policy in policies:
        policy_payload(policy)
        add_if_missing(
            session,
            PolicyProgram,
            policy["id"],
            category=policy["category"],
            title=policy["title"],
            agency=policy["agency"],
            region=policy.get("region"),
            summary=policy["summary"],
            default_eligibility_status=policy.get("default_eligibility_status"),
            eligibility_checks=policy["eligibility_checks"],
            reasons=policy["reasons"],
            missing_conditions=policy["missing_conditions"],
            application_window=policy.get("application_window"),
            documents=policy["documents"],
            deadline=policy.get("deadline"),
            next_step=policy.get("next_step"),
            source_note=policy.get("source_note"),
            source_excerpt=policy["source_excerpt"],
            source_url=policy.get("source_url"),
            query_hint=policy.get("query_hint"),
            source_updated_at=policy.get("source_updated_at"),
            demo=True,
        )

    # Explicit flush boundaries keep FK ordering reliable even though the core
    # models intentionally do not require ORM relationships.
    session.flush()

    for alert in alerts:
        add_if_missing(
            session,
            Alert,
            alert["id"],
            kind=alert["kind"],
            title=alert["title"],
            message=alert["message"],
            reason=alert["reason"],
            category=alert.get("category"),
            region=alert.get("region"),
            target_feature=alert.get("target_feature"),
            policy_id=alert.get("policy_id"),
            source_note=alert.get("source_note"),
            action=alert.get("action"),
            active_from=anchor - timedelta(days=alert["days_ago"]),
            expires_at=alert.get("expires_at"),
            demo=True,
            created_at=anchor - timedelta(days=alert["days_ago"]),
        )
    return materials, scenarios, policies


def seed_identities_and_roster(session: Session) -> list[dict[str, str]]:
    add_if_missing(
        session,
        User,
        "demo_teacher_01",
        role="teacher",
        nickname="王老師",
        grade=None,
        region=None,
        is_demo=True,
    )
    add_if_missing(
        session,
        User,
        "demo_government_01",
        role="government",
        nickname="高雄市政府 Demo",
        grade=None,
        region=None,
        is_demo=True,
    )
    session.flush()
    class_labels = {"801": "八年一班", "802": "八年二班", "803": "八年三班"}
    for class_code, label in class_labels.items():
        add_if_missing(
            session,
            TeacherClass,
            f"demo-class-{class_code}",
            teacher_user_id="demo_teacher_01",
            school_name=SCHOOL_NAME,
            class_code=class_code,
            class_label=label,
        )
    session.flush()

    roster: list[dict[str, str]] = []
    for index, name in enumerate(FICTIONAL_NAMES):
        number = index + 1
        user_id = "demo_student_01" if index == 0 else f"demo_student_{number:02d}"
        class_code = ("801", "802", "803")[index // 14]
        region = DISTRICTS[(index + 3) % len(DISTRICTS)]
        add_if_missing(
            session,
            User,
            user_id,
            role="student",
            nickname="小明" if index == 0 else name,
            grade=8,
            region=region,
            is_demo=True,
        )
        session.flush()
        if session.scalar(select(Profile).where(Profile.user_id == user_id)) is None:
            session.add(
                Profile(
                    id=f"profile-{user_id}",
                    user_id=user_id,
                    family_occupation="farmer" if index == 0 else None,
                    family_type=None,
                    economic_status=None,
                    other_identities=[],
                )
            )
        roster_id = f"student-{number:02d}"
        add_if_missing(
            session,
            RosterStudent,
            roster_id,
            user_id=user_id,
            class_id=f"demo-class-{class_code}",
            name=name,
            seat_number=(index % 14) + 1,
        )
        roster.append({"roster_id": roster_id, "user_id": user_id, "region": region})

    session.flush()
    for principal_id, config_key, user_id, daily_limit in [
        ("demo-principal-student", "student_demo", "demo_student_01", 20),
        ("demo-principal-teacher", "teacher_demo", "demo_teacher_01", 0),
        ("demo-principal-government", "government_demo", "demo_government_01", 0),
    ]:
        add_if_missing(
            session,
            DemoPrincipal,
            principal_id,
            config_key=config_key,
            user_id=user_id,
            daily_quota_limit=daily_limit,
            enabled=True,
        )
    return roster


def seed_conversation(
    session: Session,
    *,
    conversation_id: str,
    title: str,
    mode: str,
    question: str,
    response_text: str,
    structured_response: dict[str, Any],
    sources: list[dict[str, Any]],
    response_type: str,
    created_at: datetime,
    category: str | None = None,
    topic: str | None = None,
) -> SeededAssistant:
    assistant_id = f"{conversation_id}-assistant"
    existing_conversation = session.get(Conversation, conversation_id)
    if existing_conversation is not None:
        existing_message = session.get(Message, assistant_id)
        if existing_message is None or existing_message.structured_response is None:
            raise RuntimeError(
                f"existing seeded conversation is missing its assistant snapshot: {conversation_id}"
            )
        return {
            "message_id": existing_message.id,
            "user_id": existing_conversation.user_id,
            "created_at": existing_message.created_at,
            "response_type": existing_message.response_type.value,
            "topic": existing_conversation.topic.value
            if existing_conversation.topic
            else None,
            "category": existing_conversation.category.value
            if existing_conversation.category
            else None,
            "structured_response": existing_message.structured_response,
        }
    assistant_created_at = created_at + timedelta(minutes=1)
    session.add(
        Conversation(
            id=conversation_id,
            user_id="demo_student_01",
            title=title,
            mode=mode,
            category=category,
            topic=topic,
            demo=True,
            created_at=created_at,
            updated_at=assistant_created_at,
        )
    )
    session.flush()
    session.add_all(
        [
            Message(
                id=f"{conversation_id}-user",
                conversation_id=conversation_id,
                sequence=0,
                role="user",
                text=question,
                response_type=None,
                structured_response=None,
                source_snapshot=[],
                suggested_follow_ups=[],
                attachment_ids_snapshot=[],
                demo=True,
                created_at=created_at,
            ),
            Message(
                id=assistant_id,
                conversation_id=conversation_id,
                sequence=1,
                role="assistant",
                text=response_text,
                response_type=response_type,
                structured_response=structured_response,
                source_snapshot=sources,
                suggested_follow_ups=structured_response["suggested_follow_ups"],
                attachment_ids_snapshot=[],
                demo=True,
                created_at=assistant_created_at,
            ),
        ]
    )
    ConversationMessageWire(
        message_id=assistant_id,
        role="assistant",
        text=response_text,
        attachment_ids=[],
        attachments=[],
        response_type=response_type,
        learning_answer=structured_response["learning_answer"],
        resource_recommendation=structured_response["resource_recommendation"],
        memory_suggestion=structured_response["memory_suggestion"],
        alert=structured_response["alert"],
        sources=sources,
        suggested_follow_ups=structured_response["suggested_follow_ups"],
        created_at=assistant_created_at,
        demo=True,
    )
    return {
        "message_id": assistant_id,
        "user_id": "demo_student_01",
        "created_at": assistant_created_at,
        "response_type": response_type,
        "topic": topic,
        "category": category,
        "structured_response": structured_response,
    }


def seed_mutable_demo(
    session: Session,
    *,
    anchor: datetime,
    roster: list[dict[str, str]],
    materials: list[dict[str, Any]],
    scenarios: list[dict[str, Any]],
    policies: list[dict[str, Any]],
) -> None:
    if session.get(SystemMetadata, MUTABLE_SEED_KEY) is not None:
        return

    material_by_id = {item["id"]: item for item in materials}
    scenario_by_topic = {item["topic"]: item for item in scenarios}
    policy_by_id = {item["id"]: item for item in policies}
    learning_messages: list[SeededAssistant] = []
    resource_messages: list[SeededAssistant] = []

    learning_conversations = [
        ("demo-conv-newton", "牛頓力學的解釋", "newton", 0),
        ("demo-conv-thermodynamics", "熱力學的解釋", "thermodynamics", 1),
        ("demo-conv-equilibrium", "化學平衡為什麼還在反應？", "equilibrium", 2),
    ]
    for conversation_id, title, topic, days_ago in learning_conversations:
        scenario = scenario_by_topic[topic]
        answer = LearningAnswerWire.model_validate(
            scenario["answer_payload"]
        ).model_dump(mode="json")
        sources = [
            curriculum_source(material_by_id[source_id])
            for source_id in answer["source_ids"]
        ]
        structured = {
            "response_type": "learning_answer",
            "text": answer["summary"],
            "learning_answer": answer,
            "resource_recommendation": None,
            "memory_suggestion": None,
            "alert": None,
            "sources": sources,
            "suggested_follow_ups": [item["question"] for item in answer["follow_ups"]],
        }
        learning_messages.append(
            seed_conversation(
                session,
                conversation_id=conversation_id,
                title=title,
                mode="learning",
                question=scenario["canonical_question"],
                response_text=answer["summary"],
                structured_response=structured,
                sources=sources,
                response_type="learning_answer",
                topic=topic,
                created_at=anchor - timedelta(days=days_ago, hours=2),
            )
        )

    resource_conversations = [
        (
            "demo-conv-agriculture",
            "農作物受損有什麼補助？",
            "demo-agriculture-disaster-aid",
            "阿公的菜園被颱風吹壞了，有沒有補助可以申請？",
            3,
        ),
        (
            "demo-conv-disaster",
            "家裡有災害應該怎麼辦？",
            "demo-disaster-relief-placement",
            "家裡淹水，家具都壞了，暫時也沒地方住，可以找誰幫忙？",
            4,
        ),
        (
            "demo-conv-education",
            "申請助學金需要什麼文件？",
            "demo-education-aid-and-loan",
            "快開學了，家裡最近收入不穩，學費和生活費有什麼資源可以幫忙？",
            5,
        ),
        (
            "demo-conv-economy",
            "弱勢家庭有哪些生活補助？",
            "demo-economy-child-family-support",
            "爸爸最近失業，家裡還有弟弟妹妹要照顧，生活費快不夠了怎麼辦？",
            8,
        ),
        (
            "demo-conv-agri-finance",
            "農業貸款條件是什麼？",
            "demo-agriculture-finance-consultation",
            "農業經營需要資金，可以先問哪些條件？",
            12,
        ),
    ]
    agriculture_suggestion_id = "demo-suggestion-family-occupation"
    agriculture_expiry = anchor + timedelta(days=30)
    for conversation_id, title, policy_id, question, days_ago in resource_conversations:
        policy = policy_by_id[policy_id]
        resource = policy_payload(policy)
        suggestion = None
        if policy_id == "demo-agriculture-disaster-aid":
            suggestion = MemorySuggestionWire(
                suggestion_id=agriculture_suggestion_id,
                key="family_occupation",
                value="farmer",
                display_value="家裡從事農業",
                reason="未來可以更快提醒農業相關資源方向。",
                expires_at=agriculture_expiry,
            ).model_dump(mode="json")
        sources = resource["sources"]
        structured = {
            "response_type": "resource_recommendation",
            "text": resource["summary"],
            "learning_answer": None,
            "resource_recommendation": resource,
            "memory_suggestion": suggestion,
            "alert": None,
            "sources": sources,
            "suggested_follow_ups": [
                "要去哪裡申請？",
                "需要準備哪些資料？",
                "期限如何確認？",
            ],
        }
        resource_messages.append(
            seed_conversation(
                session,
                conversation_id=conversation_id,
                title=title,
                mode="resource",
                question=question,
                response_text=resource["summary"],
                structured_response=structured,
                sources=sources,
                response_type="resource_recommendation",
                category=policy["category"],
                created_at=anchor - timedelta(days=days_ago, hours=2),
            )
        )

    session.flush()
    session.add(
        MemorySuggestion(
            id=agriculture_suggestion_id,
            user_id="demo_student_01",
            conversation_id="demo-conv-agriculture",
            source_message_id="demo-conv-agriculture-assistant",
            memory_key="family_occupation",
            value="farmer",
            display_value="家裡從事農業",
            reason="未來可以更快提醒農業相關資源方向。",
            status="accepted",
            expires_at=agriculture_expiry,
            accepted_at=anchor - timedelta(days=2),
            created_at=anchor - timedelta(days=3),
        )
    )
    session.flush()
    session.add(
        ProfileMemory(
            id="demo-memory-family-occupation",
            user_id="demo_student_01",
            memory_key="family_occupation",
            value="farmer",
            display_value="家裡從事農業",
            reason="使用者在 Demo 情境中明確同意保存。",
            suggestion_id=agriculture_suggestion_id,
            source_conversation_id="demo-conv-agriculture",
            consented_at=anchor - timedelta(days=2),
            created_at=anchor - timedelta(days=2),
            updated_at=anchor - timedelta(days=2),
        )
    )
    session.add(
        AlertRead(
            id="demo-alert-read-learning",
            alert_id="demo-alert-learning",
            user_id="demo_student_01",
            read_at=anchor - timedelta(days=1),
        )
    )

    message_activities: list[LearningActivity] = []
    for message in learning_messages:
        topic = message["topic"]
        if topic is None:
            raise RuntimeError("learning conversation must have a topic")
        activity = LearningActivity(
            id=f"demo-learning-message-{topic}",
            roster_student_id="student-01",
            message_id=message["message_id"],
            topic=topic,
            subject=SUBJECT_BY_TOPIC[topic],
            practice_correct=None,
            animation_completed=None,
            occurred_at=message["created_at"],
            demo=True,
        )
        session.add(activity)
        message_activities.append(activity)

    activities: list[LearningActivity] = []
    for student_index, student in enumerate(roster):
        for observation in range(3):
            topic = TOPICS[(student_index + observation) % len(TOPICS)]
            threshold = (
                45 if student_index % 7 == 0 else 62 if student_index % 5 == 0 else 80
            )
            correct = (student_index * 17 + observation * 29 + 11) % 100 < threshold
            activity = LearningActivity(
                id=f"demo-learning-{student_index + 1:02d}-{observation + 1}",
                roster_student_id=student["roster_id"],
                message_id=None,
                topic=topic,
                subject=SUBJECT_BY_TOPIC[topic],
                practice_correct=correct,
                animation_completed=(student_index + observation) % 5 != 0,
                occurred_at=anchor
                - timedelta(days=(student_index * 3 + observation) % 18, hours=4),
                demo=True,
            )
            session.add(activity)
            activities.append(activity)

    session.flush()
    gap_activities = [
        activity for activity in activities if activity.practice_correct is False
    ]
    independent_learning_insight_count = 21
    if len(gap_activities) < independent_learning_insight_count:
        raise RuntimeError(
            "authored learning fixture must contain at least 21 gap observations"
        )
    roster_by_id = {item["roster_id"]: item for item in roster}
    demo_student = roster[0]
    for index, (message, activity) in enumerate(
        zip(learning_messages, message_activities, strict=True)
    ):
        session.add(
            InsightEvent(
                id=f"demo-insight-learning-{index + 1:02d}",
                message_id=message["message_id"],
                learning_activity_id=activity.id,
                user_id=message["user_id"],
                region=demo_student["region"],
                event_type="learning_gap",
                government_topic="science",
                learning_topic=message["topic"],
                resource_category=None,
                confidence=0.90 + index / 100,
                potential_need=False,
                resource_view=False,
                source_kind="assistant_message",
                source_reference=message["message_id"],
                occurred_at=message["created_at"],
                demo=True,
            )
        )

    for index, activity in enumerate(
        gap_activities[:independent_learning_insight_count], start=4
    ):
        student = roster_by_id[activity.roster_student_id]
        session.add(
            InsightEvent(
                id=f"demo-insight-learning-{index:02d}",
                message_id=None,
                learning_activity_id=activity.id,
                user_id=student["user_id"],
                region=student["region"],
                event_type="learning_gap",
                government_topic="science",
                learning_topic=activity.topic,
                resource_category=None,
                confidence=0.80 + (index % 10) / 100,
                potential_need=False,
                resource_view=False,
                source_kind="learning_activity",
                source_reference=activity.id,
                occurred_at=activity.occurred_at,
                demo=True,
            )
        )

    resource_patterns = [
        ("agriculture", "agriculture", True, False, "resource_need"),
        ("education", "education", True, False, "resource_need"),
        ("financial", "economy", True, False, "resource_need"),
        ("admission", "education", False, True, "resource_interest"),
        ("health", "health", True, False, "resource_need"),
        ("financial", "disaster", False, True, "resource_interest"),
    ]
    government_topic_by_category = {
        "agriculture": "agriculture",
        "disaster": "financial",
        "education": "education",
        "economy": "financial",
        "health": "health",
        "other": "financial",
    }
    for index, message in enumerate(resource_messages, start=1):
        payload = message["structured_response"]["resource_recommendation"]
        category = payload["category"]
        eligibility_status = payload["eligibility_status"]
        session.add(
            InsightEvent(
                id=f"demo-insight-resource-{index:02d}",
                message_id=message["message_id"],
                learning_activity_id=None,
                user_id=message["user_id"],
                region=demo_student["region"],
                event_type="resource_need",
                government_topic=government_topic_by_category[category],
                learning_topic=None,
                resource_category=category,
                confidence=0.90,
                potential_need=eligibility_status
                in {"possibly_eligible", "needs_confirmation"},
                resource_view=False,
                source_kind="assistant_message",
                source_reference=message["message_id"],
                occurred_at=message["created_at"],
                demo=True,
            )
        )

    for index in range(24):
        government_topic, category, potential, viewed, event_type = resource_patterns[
            index % 6
        ]
        student = roster[(index * 5) % len(roster)]
        days_ago = index % 6 if index < 12 else 7 + index % 6
        session.add(
            InsightEvent(
                id=f"demo-insight-resource-{index + 6:02d}",
                message_id=None,
                learning_activity_id=None,
                user_id=student["user_id"],
                region=student["region"],
                event_type=event_type,
                government_topic=government_topic,
                learning_topic=None,
                resource_category=category,
                confidence=0.82 + (index % 8) / 100,
                potential_need=potential,
                resource_view=viewed,
                source_kind="authored_resource_observation",
                source_reference=f"standalone-resource-event-{index + 1:02d}",
                occurred_at=anchor - timedelta(days=days_ago, hours=3),
                demo=True,
            )
        )

    session.add(
        SystemMetadata(
            key=MUTABLE_SEED_KEY,
            value={
                "version": 1,
                "completed_at": anchor.isoformat(),
                "policy": "Mutable demo profile, memory, reads, chats, activities, insights and quota state are never reseeded.",
            },
            updated_at=anchor,
        )
    )


def count_rows(session: Session, models: Iterable[type]) -> dict[str, int]:
    return {
        model.__tablename__: int(
            session.scalar(select(func.count()).select_from(model)) or 0
        )
        for model in models
    }


def seed_database(database: Database, anchor_date: date) -> dict[str, int]:
    database.create_schema()
    anchor = datetime.combine(anchor_date, time(hour=12), timezone.utc)
    with database.session_factory() as session, session.begin():
        stored_anchor = session.get(SystemMetadata, ANCHOR_KEY)
        if stored_anchor is not None:
            anchor = datetime.fromisoformat(stored_anchor.value["anchor_datetime"])
        else:
            session.add(
                SystemMetadata(
                    key=ANCHOR_KEY,
                    value={
                        "anchor_datetime": anchor.isoformat(),
                        "strategy": "fixed_dataset_anchor",
                        "dashboard_guidance": "In offline_demo, use this anchor as as_of so seeded windows remain demonstrable after later restarts.",
                    },
                    updated_at=anchor,
                )
            )
        materials, scenarios, policies = seed_catalogs(session, anchor)
        roster = seed_identities_and_roster(session)
        session.flush()
        seed_mutable_demo(
            session,
            anchor=anchor,
            roster=roster,
            materials=materials,
            scenarios=scenarios,
            policies=policies,
        )
    with database.session_factory() as session:
        return count_rows(
            session,
            [
                User,
                Profile,
                TeacherClass,
                RosterStudent,
                CurriculumMaterial,
                CurriculumScenario,
                PolicyProgram,
                Alert,
                AlertRead,
                Conversation,
                Message,
                ProfileMemory,
                MemorySuggestion,
                LearningActivity,
                InsightEvent,
            ],
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Seed deterministic FutureAI Demo data."
    )
    parser.add_argument(
        "--database-url",
        help="Override DATABASE_URL, for example sqlite:////tmp/futureai.db",
    )
    parser.add_argument(
        "--anchor-date",
        type=date.fromisoformat,
        default=date.fromisoformat(
            os.getenv(
                "DEMO_SEED_ANCHOR_DATE", datetime.now(timezone.utc).date().isoformat()
            )
        ),
        help="First-run dataset anchor date (YYYY-MM-DD). Existing databases retain their stored anchor.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    settings = (
        Settings(database_url=args.database_url) if args.database_url else Settings()
    )
    settings.prepare_directories()
    database = Database(settings)
    try:
        counts = seed_database(database, args.anchor_date)
    finally:
        database.dispose()
    print(
        json.dumps(
            {"status": "ok", "counts": counts}, ensure_ascii=False, sort_keys=True
        )
    )


if __name__ == "__main__":
    main()
