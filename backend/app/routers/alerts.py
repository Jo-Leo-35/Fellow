from typing import Annotated

from fastapi import APIRouter, Path, Query

from app.core.dependencies import (
    AppSettingsDependency,
    DbSessionDependency,
    StudentPrincipalDependency,
    require_self,
)
from app.schemas.alerts import AlertListWire, AlertWire
from app.services.alerts import mark_read, matched_alerts

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=AlertListWire)
def alerts(
    user_id: Annotated[str, Query(min_length=1, max_length=128)],
    current: StudentPrincipalDependency,
    db: DbSessionDependency,
    settings: AppSettingsDependency,
    unread_only: bool = False,
) -> AlertListWire:
    require_self(user_id, current)
    return matched_alerts(
        db,
        user_id,
        unread_only,
        settings.runtime_mode == "offline_demo",
    )


@router.post("/{alert_id}/read", response_model=AlertWire)
def read_alert(
    alert_id: Annotated[str, Path(min_length=1, max_length=128)],
    current: StudentPrincipalDependency,
    db: DbSessionDependency,
) -> AlertWire:
    return mark_read(db, current.user.id, alert_id)
