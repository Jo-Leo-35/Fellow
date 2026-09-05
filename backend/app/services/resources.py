from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.db.models import CurriculumMaterial, PolicyProgram, Profile, User
from app.schemas.enums import EligibilityStatus, ResourceCategory
from app.schemas.resources import (
    EligibilityCheckWire,
    LearningMaterialsWire,
    ResourceListWire,
    ResourceProgramWire,
    SourceWire,
)
from app.services.common import as_utc, normalize_region


def _policy_source(program: PolicyProgram) -> SourceWire:
    return SourceWire(
        source_id=f"policy-source-{program.id}",
        source_type="policy",
        title=program.title,
        publisher=program.agency,
        chapter=None,
        page=None,
        excerpt=program.source_excerpt,
        url=program.source_url,
        query_hint=program.query_hint,
        updated_at=as_utc(program.source_updated_at)
        if program.source_updated_at
        else None,
    )


def _profile_signals(user: User, profile: Profile) -> set[ResourceCategory]:
    signals: set[ResourceCategory] = set()
    occupation = (profile.family_occupation or "").strip().casefold()
    if occupation in {"farmer", "農業", "農民", "務農", "家裡從事農業"}:
        signals.add(ResourceCategory.AGRICULTURE)
    if user.grade is not None:
        signals.add(ResourceCategory.EDUCATION)
    if profile.economic_status or profile.family_type:
        signals.add(ResourceCategory.ECONOMY)
    identity_text = " ".join(profile.other_identities or []).casefold()
    if any(
        keyword in identity_text for keyword in ("health", "medical", "健康", "醫療")
    ):
        signals.add(ResourceCategory.HEALTH)
    return signals


def _program_wire(
    program: PolicyProgram, user: User, profile: Profile
) -> tuple[ResourceProgramWire, bool]:
    signals = _profile_signals(user, profile)
    profile_match = program.category in signals
    user_region = normalize_region(user.region)
    program_region = normalize_region(program.region)
    explicit_region = program.region is not None
    region_match = not explicit_region or (
        program_region is not None and user_region == program_region
    )

    checks = [dict(item) for item in (program.eligibility_checks or [])]
    reasons = list(program.reasons or []) if profile_match else []
    missing = list(program.missing_conditions or [])
    if not profile_match:
        checks = [
            {
                "status": "needs_confirmation",
                "text": item.get("text", "需要由承辦單位確認。"),
            }
            for item in checks
        ]
    if explicit_region and not region_match:
        checks.append(
            {
                "status": "needs_confirmation",
                "text": "需確認這項資源是否適用於目前所在地區。",
            }
        )
        missing.append("適用地區")

    if (
        explicit_region
        and program_region is not None
        and user_region is not None
        and not region_match
    ):
        eligibility_status = EligibilityStatus.NOT_ELIGIBLE
    elif profile_match:
        eligibility_status = program.default_eligibility_status
        if eligibility_status == EligibilityStatus.ELIGIBLE:
            eligibility_status = EligibilityStatus.POSSIBLY_ELIGIBLE
        if eligibility_status is None:
            eligibility_status = EligibilityStatus.NEEDS_CONFIRMATION
    else:
        eligibility_status = EligibilityStatus.NEEDS_CONFIRMATION

    source = _policy_source(program)
    return (
        ResourceProgramWire(
            program_id=program.id,
            category=program.category,
            title=program.title,
            agency=program.agency,
            summary=program.summary,
            eligibility_status=eligibility_status,
            eligibility_checks=[
                EligibilityCheckWire.model_validate(item) for item in checks
            ],
            reasons=reasons,
            missing_conditions=list(dict.fromkeys(missing)),
            application_window=program.application_window,
            documents=list(program.documents or []),
            deadline=program.deadline,
            next_step=program.next_step,
            source_note=program.source_note,
            source_ids=[source.source_id],
            sources=[source],
        ),
        profile_match and region_match,
    )


def _user_profile(db: Session, user_id: str) -> tuple[User, Profile]:
    row = db.execute(
        select(User, Profile)
        .join(Profile, Profile.user_id == User.id)
        .where(User.id == user_id)
    ).one_or_none()
    if row is None:
        raise AppError(
            status_code=404,
            code="PROFILE_NOT_FOUND",
            message="找不到個人資料。",
        )
    return row


def list_resources(
    db: Session,
    user_id: str,
    category: ResourceCategory | None,
    recommended_only: bool,
    demo: bool,
) -> ResourceListWire:
    user, profile = _user_profile(db, user_id)
    statement = select(PolicyProgram)
    if category is not None:
        statement = statement.where(PolicyProgram.category == category)
    programs = list(
        db.scalars(statement.order_by(PolicyProgram.category, PolicyProgram.title))
    )
    items: list[ResourceProgramWire] = []
    for program in programs:
        item, recommended = _program_wire(program, user, profile)
        if not recommended_only or recommended:
            items.append(item)
    return ResourceListWire(items=items, demo=demo)


def get_resource(db: Session, user_id: str, program_id: str) -> ResourceProgramWire:
    user, profile = _user_profile(db, user_id)
    program = db.get(PolicyProgram, program_id)
    if program is None:
        raise AppError(
            status_code=404,
            code="RESOURCE_NOT_FOUND",
            message="找不到指定資源。",
        )
    item, _ = _program_wire(program, user, profile)
    return item


def list_learning_materials(db: Session, demo: bool) -> LearningMaterialsWire:
    materials = list(
        db.scalars(
            select(CurriculumMaterial).order_by(
                CurriculumMaterial.subject,
                CurriculumMaterial.topic,
                CurriculumMaterial.title,
            )
        )
    )
    return LearningMaterialsWire(
        items=[
            SourceWire(
                source_id=item.id,
                source_type="curriculum",
                title=item.title,
                publisher=item.publisher,
                chapter=item.chapter,
                page=item.page,
                excerpt=item.excerpt,
                url=item.url,
                query_hint=item.query_hint,
                updated_at=as_utc(item.source_updated_at)
                if item.source_updated_at
                else None,
            )
            for item in materials
        ],
        demo=demo,
    )
