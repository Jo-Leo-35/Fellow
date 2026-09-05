from __future__ import annotations

from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

OpaqueId = Annotated[str, Field(min_length=1, max_length=128)]
Count = Annotated[int, Field(ge=0)]
Percentage = Annotated[float, Field(ge=0, le=100)]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", use_enum_values=True)


class FilterOptionWire(StrictModel):
    id: str
    label: str
