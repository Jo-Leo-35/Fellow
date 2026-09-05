from typing import Annotated

from fastapi import APIRouter, Path, Response, status

from app.core.dependencies import (
    DbSessionDependency,
    StudentPrincipalDependency,
    require_self,
)
from app.schemas.profiles import (
    MemoryConsentRequestWire,
    MemoryItemWire,
    ProfilePutRequestWire,
    ProfileWire,
)
from app.services.profiles import (
    accept_memory,
    delete_memory,
    get_profile,
    replace_profile,
)

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("/{user_id}", response_model=ProfileWire)
def profile_detail(
    user_id: Annotated[str, Path(min_length=1, max_length=128)],
    current: StudentPrincipalDependency,
    db: DbSessionDependency,
) -> ProfileWire:
    require_self(user_id, current)
    return get_profile(db, user_id)


@router.put("/{user_id}", response_model=ProfileWire)
def update_profile(
    user_id: Annotated[str, Path(min_length=1, max_length=128)],
    body: ProfilePutRequestWire,
    current: StudentPrincipalDependency,
    db: DbSessionDependency,
) -> ProfileWire:
    require_self(user_id, current)
    return replace_profile(db, user_id, body)


@router.post(
    "/{user_id}/memory",
    response_model=MemoryItemWire,
    status_code=status.HTTP_201_CREATED,
)
def consent_memory(
    user_id: Annotated[str, Path(min_length=1, max_length=128)],
    body: MemoryConsentRequestWire,
    response: Response,
    current: StudentPrincipalDependency,
    db: DbSessionDependency,
) -> MemoryItemWire:
    require_self(user_id, current)
    item, created = accept_memory(db, user_id, body.suggestion_id)
    if not created:
        response.status_code = status.HTTP_200_OK
    return item


@router.delete("/{user_id}/memory/{key}", status_code=status.HTTP_204_NO_CONTENT)
def remove_memory(
    user_id: Annotated[str, Path(min_length=1, max_length=128)],
    current: StudentPrincipalDependency,
    db: DbSessionDependency,
    key: Annotated[str, Path(min_length=1, max_length=64)],
) -> Response:
    require_self(user_id, current)
    delete_memory(db, user_id, key)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
