from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import Field

from app.schemas.common import Count, OpaqueId, StrictModel
from app.schemas.enums import Role, RuntimeMode


class DemoSessionRequestWire(StrictModel):
    access_code: str = Field(min_length=1, max_length=256)


class SessionIdentityWire(StrictModel):
    user_id: OpaqueId
    role: Role
    display_name: str
    scope_label: str | None


class SessionResponseWire(StrictModel):
    access_token: str = Field(min_length=1)
    token_type: Literal["Bearer"] = "Bearer"
    expires_at: datetime
    runtime_mode: RuntimeMode
    session: SessionIdentityWire


class SessionCheckWire(StrictModel):
    expires_at: datetime
    runtime_mode: RuntimeMode
    session: SessionIdentityWire


class UsageWire(StrictModel):
    period: Literal["day"] = "day"
    limit: Count
    used: Count
    reserved: Count
    remaining: Count
    reset_at: datetime
