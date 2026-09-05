from typing import Annotated

from fastapi import APIRouter, File, Path, Request, Response, UploadFile, status
from fastapi.routing import APIRoute
from starlette.datastructures import UploadFile as ParsedUploadFile
from starlette.exceptions import HTTPException

from app.core.dependencies import (
    AppSettingsDependency,
    DbSessionDependency,
    StudentPrincipalDependency,
)
from app.core.errors import AppError
from app.schemas.uploads import AttachmentWire
from app.services.uploads import MAX_UPLOAD_BYTES, load_upload_content, store_upload


class SingleFileUploadRoute(APIRoute):
    def get_route_handler(self):
        original = super().get_route_handler()

        async def handle(request: Request):
            if request.method != "POST":
                return await original(request)
            try:
                form = await request.form(
                    max_files=1, max_fields=0, max_part_size=MAX_UPLOAD_BYTES
                )
            except HTTPException as exc:
                raise AppError(
                    status_code=422,
                    code="VALIDATION_ERROR",
                    message="上傳只允許一個名為 file 的圖片欄位。",
                ) from exc
            try:
                parts = list(form.multi_items())
                if (
                    len(parts) != 1
                    or parts[0][0] != "file"
                    or not isinstance(parts[0][1], ParsedUploadFile)
                ):
                    raise AppError(
                        status_code=422,
                        code="VALIDATION_ERROR",
                        message="上傳只允許一個名為 file 的圖片欄位。",
                    )
                return await original(request)
            finally:
                await form.close()

        return handle


router = APIRouter(
    prefix="/uploads", tags=["uploads"], route_class=SingleFileUploadRoute
)


@router.post("", response_model=AttachmentWire, status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: Annotated[UploadFile, File()],
    current: StudentPrincipalDependency,
    db: DbSessionDependency,
    settings: AppSettingsDependency,
) -> AttachmentWire:
    return await store_upload(db, settings, current.user.id, file)


@router.get("/{attachment_id}/content")
def image_content(
    attachment_id: Annotated[str, Path(min_length=1, max_length=128)],
    current: StudentPrincipalDependency,
    db: DbSessionDependency,
    settings: AppSettingsDependency,
) -> Response:
    data, media_type = load_upload_content(db, settings, current.user.id, attachment_id)
    return Response(
        content=data,
        media_type=media_type,
        headers={
            "Cache-Control": "private, no-store",
            "Content-Length": str(len(data)),
            "X-Content-Type-Options": "nosniff",
        },
    )
