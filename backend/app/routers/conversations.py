from typing import Annotated

from fastapi import APIRouter, Path, Query, Response, status

from app.core.dependencies import (
    DbSessionDependency,
    StudentPrincipalDependency,
    require_self,
)
from app.schemas.conversations import ConversationDetailWire, ConversationListWire
from app.services.conversations import (
    conversation_detail,
    delete_conversation,
    list_conversations,
)

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.get("", response_model=ConversationListWire)
def history(
    user_id: Annotated[str, Query(min_length=1, max_length=128)],
    current: StudentPrincipalDependency,
    db: DbSessionDependency,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    cursor: Annotated[str | None, Query(min_length=1, max_length=128)] = None,
) -> ConversationListWire:
    require_self(user_id, current)
    return list_conversations(db, user_id, limit, cursor)


@router.get("/{conversation_id}", response_model=ConversationDetailWire)
def detail(
    conversation_id: Annotated[str, Path(min_length=1, max_length=128)],
    current: StudentPrincipalDependency,
    db: DbSessionDependency,
) -> ConversationDetailWire:
    return conversation_detail(db, conversation_id, current.user.id)


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove(
    conversation_id: Annotated[str, Path(min_length=1, max_length=128)],
    current: StudentPrincipalDependency,
    db: DbSessionDependency,
) -> Response:
    delete_conversation(db, conversation_id, current.user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
