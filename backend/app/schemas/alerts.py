from __future__ import annotations

from datetime import datetime
from typing import Literal

from app.schemas.common import Count, OpaqueId, StrictModel
from app.schemas.enums import AlertKind


class AlertActionWire(StrictModel):
    kind: Literal["resource", "conversation", "learning_topic"]
    target_id: OpaqueId | None
    label: str


class AlertWire(StrictModel):
    alert_id: OpaqueId
    kind: AlertKind
    title: str
    message: str
    reason: str
    created_at: datetime
    read_at: datetime | None
    action: AlertActionWire | None


class AlertListWire(StrictModel):
    items: list[AlertWire]
    unread_count: Count
    demo: bool
