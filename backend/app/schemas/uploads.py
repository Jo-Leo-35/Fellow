from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import Field

from app.schemas.common import OpaqueId, StrictModel


class AttachmentWire(StrictModel):
    attachment_id: OpaqueId
    filename: str
    media_type: Literal["image/jpeg", "image/png"]
    size_bytes: int = Field(ge=0)
    download_url: str
    owner_user_id: OpaqueId
    created_at: datetime


UploadResponseWire = AttachmentWire
