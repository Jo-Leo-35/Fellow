from __future__ import annotations

import hashlib
import io
import secrets
import unicodedata
import warnings
from datetime import timedelta
from pathlib import Path

from fastapi import UploadFile
from PIL import Image, UnidentifiedImageError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.errors import AppError
from app.db.models import MessageAttachment, UploadedFile, new_id
from app.schemas.uploads import AttachmentWire
from app.services.common import as_utc, utc_now

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
MAX_IMAGE_PIXELS = 40_000_000
MEDIA_FORMATS = {
    "image/jpeg": ("JPEG", ".jpg"),
    "image/png": ("PNG", ".png"),
}


def _storage_path(settings: Settings, storage_key: str) -> Path:
    if Path(storage_key).name != storage_key:
        raise AppError(
            status_code=404,
            code="ATTACHMENT_NOT_FOUND",
            message="找不到這張圖片。",
        )
    root = settings.upload_dir.resolve()
    candidate = (root / storage_key).resolve()
    if candidate.parent != root:
        raise AppError(
            status_code=404,
            code="ATTACHMENT_NOT_FOUND",
            message="找不到這張圖片。",
        )
    return candidate


def _magic_media_type(data: bytes) -> str | None:
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    return None


def _decode_image(data: bytes, expected_format: str) -> None:
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(data)) as image:
                if image.format != expected_format:
                    raise ValueError("decoded format does not match the media type")
                if image.width * image.height > MAX_IMAGE_PIXELS:
                    raise ValueError("image dimensions are too large")
                image.verify()
            with Image.open(io.BytesIO(data)) as image:
                image.load()
    except (
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
        UnidentifiedImageError,
        OSError,
        SyntaxError,
        ValueError,
    ) as exc:
        raise AppError(
            status_code=422,
            code="UPLOAD_INVALID",
            message="圖片內容損毀或無法正確解碼。",
        ) from exc


def _safe_filename(filename: str | None, extension: str) -> str:
    raw = unicodedata.normalize("NFKC", filename or "").replace("\\", "/")
    name = raw.rsplit("/", 1)[-1]
    name = "".join(character for character in name if 31 < ord(character) != 127)
    name = name.strip().strip(".")
    stem = Path(name).stem.strip().strip(".") if name else "image"
    if not stem:
        stem = "image"
    return f"{stem[: 255 - len(extension)]}{extension}"


def attachment_wire(file: UploadedFile) -> AttachmentWire:
    return AttachmentWire(
        attachment_id=file.id,
        filename=file.original_filename,
        media_type=file.media_type,
        size_bytes=file.size_bytes,
        download_url=f"/api/v1/uploads/{file.id}/content",
        owner_user_id=file.owner_user_id,
        created_at=as_utc(file.created_at),
    )


async def store_upload(
    db: Session,
    settings: Settings,
    owner_user_id: str,
    upload: UploadFile,
) -> AttachmentWire:
    declared_type = upload.content_type
    if declared_type not in MEDIA_FORMATS:
        raise AppError(
            status_code=415,
            code="UNSUPPORTED_MEDIA_TYPE",
            message="只支援 JPEG 或 PNG 圖片。",
        )

    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await upload.read(min(1024 * 1024, MAX_UPLOAD_BYTES + 1 - total))
        if not chunk:
            break
        chunks.append(chunk)
        total += len(chunk)
        if total > MAX_UPLOAD_BYTES:
            raise AppError(
                status_code=413,
                code="FILE_TOO_LARGE",
                message="圖片不可超過 5 MiB。",
            )
    data = b"".join(chunks)
    magic_type = _magic_media_type(data)
    if magic_type != declared_type:
        raise AppError(
            status_code=415,
            code="UNSUPPORTED_MEDIA_TYPE",
            message="圖片格式與宣告的 MIME type 不一致。",
        )

    expected_format, extension = MEDIA_FORMATS[declared_type]
    _decode_image(data, expected_format)
    now = utc_now()
    file_id = new_id("file")
    storage_key = f"{secrets.token_hex(32)}{extension}"
    filename = _safe_filename(upload.filename, extension)
    destination = _storage_path(settings, storage_key)
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    try:
        with destination.open("xb") as handle:
            handle.write(data)
        record = UploadedFile(
            id=file_id,
            owner_user_id=owner_user_id,
            original_filename=filename,
            storage_key=storage_key,
            media_type=declared_type,
            size_bytes=len(data),
            sha256=hashlib.sha256(data).hexdigest(),
            created_at=now,
        )
        db.add(record)
        db.commit()
    except Exception:
        db.rollback()
        destination.unlink(missing_ok=True)
        raise
    return attachment_wire(record)


def load_upload_content(
    db: Session,
    settings: Settings,
    owner_user_id: str,
    attachment_id: str,
) -> tuple[bytes, str]:
    record = db.get(UploadedFile, attachment_id)
    if record is None:
        raise AppError(
            status_code=404,
            code="ATTACHMENT_NOT_FOUND",
            message="找不到這張圖片。",
        )
    if record.owner_user_id != owner_user_id:
        raise AppError(
            status_code=403,
            code="USER_SCOPE_FORBIDDEN",
            message="不能讀取其他使用者的圖片。",
        )
    return read_stored_upload(settings, record), record.media_type


def read_stored_upload(settings: Settings, record: UploadedFile) -> bytes:
    path = _storage_path(settings, record.storage_key)
    try:
        data = path.read_bytes()
    except (FileNotFoundError, OSError) as exc:
        raise AppError(
            status_code=404,
            code="ATTACHMENT_NOT_FOUND",
            message="找不到這張圖片。",
        ) from exc
    if (
        len(data) != record.size_bytes
        or hashlib.sha256(data).hexdigest() != record.sha256
        or _magic_media_type(data) != record.media_type
    ):
        raise AppError(
            status_code=404,
            code="ATTACHMENT_NOT_FOUND",
            message="找不到這張圖片。",
        )
    return data


def cleanup_expired_unattached_uploads(db: Session, settings: Settings) -> int:
    cutoff = utc_now() - timedelta(hours=settings.unattached_upload_ttl_hours)
    records = list(
        db.scalars(
            select(UploadedFile)
            .outerjoin(
                MessageAttachment,
                MessageAttachment.attachment_id == UploadedFile.id,
            )
            .where(
                MessageAttachment.id.is_(None),
                UploadedFile.created_at < cutoff,
            )
        )
    )
    removed = 0
    for record in records:
        try:
            path = _storage_path(settings, record.storage_key)
        except AppError:
            continue
        try:
            path.unlink(missing_ok=True)
        except OSError:
            continue
        db.delete(record)
        removed += 1
    if removed:
        db.commit()
    return removed
