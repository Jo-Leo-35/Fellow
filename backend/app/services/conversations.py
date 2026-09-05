from __future__ import annotations

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.db.models import Conversation, Message, UploadedFile
from app.schemas.conversations import (
    ConversationDetailWire,
    ConversationListWire,
    ConversationMessageWire,
    ConversationSummaryWire,
)
from app.schemas.uploads import AttachmentWire
from app.services.common import as_utc


def _attachment(file: UploadedFile) -> AttachmentWire:
    return AttachmentWire(
        attachment_id=file.id,
        filename=file.original_filename,
        media_type=file.media_type,
        size_bytes=file.size_bytes,
        download_url=f"/api/v1/uploads/{file.id}/content",
        owner_user_id=file.owner_user_id,
        created_at=as_utc(file.created_at),
    )


def _conversation_for_owner(
    db: Session, conversation_id: str, user_id: str
) -> Conversation:
    conversation = db.get(Conversation, conversation_id)
    if conversation is None:
        raise AppError(
            status_code=404,
            code="CONVERSATION_NOT_FOUND",
            message="找不到這筆聊天紀錄。",
        )
    if conversation.user_id != user_id:
        raise AppError(
            status_code=403,
            code="USER_SCOPE_FORBIDDEN",
            message="不能存取其他使用者的聊天紀錄。",
        )
    return conversation


def list_conversations(
    db: Session,
    user_id: str,
    limit: int,
    cursor: str | None,
) -> ConversationListWire:
    cursor_row: Conversation | None = None
    if cursor is not None:
        cursor_row = db.scalar(
            select(Conversation).where(
                Conversation.id == cursor,
                Conversation.user_id == user_id,
            )
        )
        if cursor_row is None:
            raise AppError(
                status_code=422,
                code="VALIDATION_ERROR",
                message="聊天紀錄游標無效。",
            )

    statement = select(Conversation).where(Conversation.user_id == user_id)
    if cursor_row is not None:
        statement = statement.where(
            or_(
                Conversation.updated_at < cursor_row.updated_at,
                and_(
                    Conversation.updated_at == cursor_row.updated_at,
                    Conversation.id < cursor_row.id,
                ),
            )
        )
    conversations = list(
        db.scalars(
            statement.order_by(
                Conversation.updated_at.desc(), Conversation.id.desc()
            ).limit(limit + 1)
        )
    )
    has_more = len(conversations) > limit
    conversations = conversations[:limit]
    items: list[ConversationSummaryWire] = []
    for conversation in conversations:
        messages = list(
            db.scalars(
                select(Message)
                .where(Message.conversation_id == conversation.id)
                .order_by(Message.sequence)
            )
        )
        last_message = messages[-1] if messages else None
        last_response_type = next(
            (
                message.response_type
                for message in reversed(messages)
                if message.response_type is not None
            ),
            None,
        )
        items.append(
            ConversationSummaryWire(
                conversation_id=conversation.id,
                title=conversation.title,
                mode=conversation.mode,
                last_response_type=last_response_type,
                preview=last_message.text if last_message else "",
                message_count=len(messages),
                created_at=as_utc(conversation.created_at),
                updated_at=as_utc(conversation.updated_at),
                demo=conversation.demo,
            )
        )
    return ConversationListWire(
        items=items,
        next_cursor=conversations[-1].id if has_more and conversations else None,
    )


def conversation_detail(
    db: Session, conversation_id: str, user_id: str
) -> ConversationDetailWire:
    conversation = _conversation_for_owner(db, conversation_id, user_id)
    messages = list(
        db.scalars(
            select(Message)
            .where(Message.conversation_id == conversation.id)
            .order_by(Message.sequence)
        )
    )
    attachment_ids = {
        attachment_id
        for message in messages
        for attachment_id in (message.attachment_ids_snapshot or [])
    }
    files = []
    if attachment_ids:
        files = list(
            db.scalars(
                select(UploadedFile).where(
                    UploadedFile.id.in_(attachment_ids),
                    UploadedFile.owner_user_id == user_id,
                )
            )
        )
    files_by_id = {item.id: item for item in files}

    response_messages: list[ConversationMessageWire] = []
    for message in messages:
        snapshot = message.structured_response or {}
        ids = list(message.attachment_ids_snapshot or [])
        response_messages.append(
            ConversationMessageWire(
                message_id=message.id,
                role=message.role,
                text=message.text,
                attachment_ids=ids,
                attachments=[
                    _attachment(files_by_id[item_id])
                    for item_id in ids
                    if item_id in files_by_id
                ],
                response_type=message.response_type,
                learning_answer=snapshot.get("learning_answer"),
                resource_recommendation=snapshot.get("resource_recommendation"),
                memory_suggestion=snapshot.get("memory_suggestion"),
                alert=snapshot.get("alert"),
                sources=list(message.source_snapshot or []),
                suggested_follow_ups=list(message.suggested_follow_ups or []),
                created_at=as_utc(message.created_at),
                demo=message.demo,
            )
        )
    return ConversationDetailWire(
        conversation_id=conversation.id,
        user_id=conversation.user_id,
        title=conversation.title,
        mode=conversation.mode,
        created_at=as_utc(conversation.created_at),
        updated_at=as_utc(conversation.updated_at),
        demo=conversation.demo,
        messages=response_messages,
    )


def delete_conversation(db: Session, conversation_id: str, user_id: str) -> None:
    conversation = _conversation_for_owner(db, conversation_id, user_id)
    db.delete(conversation)
    db.commit()
