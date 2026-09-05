from typing import Annotated, Literal

from fastapi import APIRouter, Query

from app.core.dependencies import (
    AppSettingsDependency,
    DbSessionDependency,
    GovernmentPrincipalDependency,
    TeacherPrincipalDependency,
)
from app.core.errors import AppError
from app.schemas.dashboard import GovernmentDashboardWire, TeacherDashboardWire
from app.schemas.enums import GovernmentTopic
from app.services.dashboards import government_dashboard, teacher_dashboard

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/teacher", response_model=TeacherDashboardWire)
def teacher_snapshot(
    current: TeacherPrincipalDependency,
    db: DbSessionDependency,
    settings: AppSettingsDependency,
    period: Literal["7d", "30d", "term"] = "7d",
    class_id: Literal["all", "801", "802", "803"] = "all",
    subject: Literal["all", "物理", "化學"] = "all",
    attention_threshold: Annotated[int, Query(ge=50, le=70)] = 65,
) -> TeacherDashboardWire:
    if attention_threshold not in {50, 60, 65, 70}:
        raise AppError(
            status_code=422,
            code="VALIDATION_ERROR",
            message="attention_threshold 必須是 50、60、65 或 70。",
        )
    return teacher_dashboard(
        db,
        current.user.id,
        settings.runtime_mode,
        period,
        class_id,
        subject,
        attention_threshold,
    )


@router.get("/government", response_model=GovernmentDashboardWire)
def government_snapshot(
    _current: GovernmentPrincipalDependency,
    db: DbSessionDependency,
    settings: AppSettingsDependency,
    period: Literal["7d", "30d", "quarter"] = "7d",
    region: Literal["all", "甲仙", "六龜", "杉林", "美濃", "旗山", "內門"] = "all",
    topic: GovernmentTopic | None = None,
) -> GovernmentDashboardWire:
    return government_dashboard(db, settings.runtime_mode, period, region, topic)
