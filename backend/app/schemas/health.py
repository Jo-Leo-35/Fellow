from typing import Literal

from app.schemas.common import StrictModel
from app.schemas.enums import RuntimeMode


class HealthWire(StrictModel):
    status: Literal["ok"]
    database: Literal["ok"]
    runtime_mode: RuntimeMode
