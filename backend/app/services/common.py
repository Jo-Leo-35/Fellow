from __future__ import annotations

import unicodedata
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.db.models import SystemMetadata

DEMO_ANCHOR_KEY = "demo_seed_v1_anchor"
ALLOWED_REGIONS = ("甲仙", "六龜", "杉林", "美濃", "旗山", "內門")


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def normalize_region(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = "".join(unicodedata.normalize("NFKC", value).split())
    for region in ALLOWED_REGIONS:
        if normalized in {region, f"{region}區", f"高雄市{region}區"}:
            return region
    return None


def dataset_as_of(db: Session, runtime_mode: str) -> datetime:
    if runtime_mode != "offline_demo":
        return utc_now()
    metadata = db.get(SystemMetadata, DEMO_ANCHOR_KEY)
    if metadata is None:
        return utc_now()
    raw_value = metadata.value.get("anchor_datetime")
    if not isinstance(raw_value, str):
        return utc_now()
    try:
        return as_utc(datetime.fromisoformat(raw_value))
    except ValueError:
        return utc_now()
