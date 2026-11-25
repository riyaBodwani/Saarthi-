from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.conversation import Conversation, Message
from app.models.notice import Notice
from app.models.user import User
from app.services.assistant import answer_from_notice

router = APIRouter(prefix="/assistant", tags=["assistant"])


class ConversationCreate(BaseModel):
    notice_id: str | None = None
    title: str | None = None


class MessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=4000)
    language: str = "english"


def _serialize_conversation(conversation: Conversation) -> dict:
    return {
        "id": conversation.id,
        "notice_id": conversation.notice_id,
        "title": conversation.title,
        "created_at": conversation.created_at,
        "messages": [
            {
                "id": message.id,
                "role": message.role,
                "content": message.content,
                "sources": message.sources_json or [],
                "created_at": message.created_at,
            }
            for message in sorted(conversation.messages, key=lambda item: item.created_at or 0)
        ],
    }


@router.post("/conversations")
def create_conversation(
    payload: ConversationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    if payload.notice_id:
        notice = db.scalar(
            select(Notice).where(Notice.id == payload.notice_id, Notice.user_id == user.id)
        )
        if notice is None:
            raise HTTPException(status_code=404, detail="Notice not found.")
    conversation = Conversation(
        user_id=user.id,
        notice_id=payload.notice_id,
        title=payload.title or "Notice chat",
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return _serialize_conversation(conversation)


@router.get("/conversations")
def list_conversations(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    rows = db.scalars(
        select(Conversation)
        .where(Conversation.user_id == user.id)
        .options(selectinload(Conversation.messages))
        .order_by(Conversation.created_at.desc())
    ).all()
    return [_serialize_conversation(row) for row in rows]


@router.get("/conversations/{conversation_id}")
def get_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    conversation = db.scalar(
        select(Conversation)
        .where(Conversation.id == conversation_id, Conversation.user_id == user.id)
        .options(selectinload(Conversation.messages))
    )
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return _serialize_conversation(conversation)


@router.post("/conversations/{conversation_id}/messages")
def post_message(
    conversation_id: str,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    conversation = db.scalar(
        select(Conversation)
        .where(Conversation.id == conversation_id, Conversation.user_id == user.id)
        .options(selectinload(Conversation.messages))
    )
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    user_message = Message(
        conversation_id=conversation.id,
        role="user",
        content=payload.content,
    )
    db.add(user_message)

    extracted_text = ""
    analysis = None
    pages = None
    if conversation.notice_id:
        notice = db.scalar(
            select(Notice)
            .where(Notice.id == conversation.notice_id, Notice.user_id == user.id)
            .options(selectinload(Notice.analysis))
        )
        if notice is None:
            raise HTTPException(status_code=404, detail="Linked notice not found.")
        extracted_text = notice.extracted_text or ""
        analysis = notice.analysis.structured_json if notice.analysis else None
        pages = notice.pages_json if isinstance(notice.pages_json, list) else None

    result = answer_from_notice(
        question=payload.content,
        language=payload.language,
        extracted_text=extracted_text,
        analysis=analysis,
        pages=pages,
    )
    assistant_message = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=result["content"],
        sources_json=result.get("sources") or [],
    )
    db.add(assistant_message)
    db.commit()
    db.refresh(assistant_message)
    return {
        "message": {
            "id": assistant_message.id,
            "role": "assistant",
            "content": assistant_message.content,
            "sources": assistant_message.sources_json or [],
        }
    }


@router.post("/conversations/{conversation_id}/clear")
def clear_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    conversation = db.scalar(
        select(Conversation)
        .where(Conversation.id == conversation_id, Conversation.user_id == user.id)
        .options(selectinload(Conversation.messages))
    )
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    for message in list(conversation.messages):
        db.delete(message)
    db.commit()
    return {"id": conversation.id, "messages": []}
