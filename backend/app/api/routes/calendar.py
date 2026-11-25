from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.notice import ActionItem, Notice, NoticeDate
from app.models.reminder import Notification, Reminder
from app.models.user import User

router = APIRouter(tags=["calendar"])


class ActionItemUpdate(BaseModel):
    status: str | None = None
    title: str | None = None
    priority: str | None = None


class ReminderCreate(BaseModel):
    notice_id: str | None = None
    action_item_id: str | None = None
    scheduled_at: datetime
    title: str = "Reminder"


class ReminderUpdate(BaseModel):
    scheduled_at: datetime | None = None
    status: str | None = None
    title: str | None = None


@router.get("/calendar/events")
def calendar_events(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    rows = db.scalars(
        select(NoticeDate)
        .join(Notice)
        .where(Notice.user_id == user.id)
        .options(selectinload(NoticeDate.notice))
        .order_by(NoticeDate.normalized_date.asc())
    ).all()
    events = []
    for item in rows:
        events.append(
            {
                "id": item.id,
                "title": item.event_name,
                "event_name": item.event_name,
                "date": item.normalized_date.isoformat() if item.normalized_date else None,
                "normalized_date": item.normalized_date.isoformat() if item.normalized_date else None,
                "category": item.category,
                "urgency": item.urgency,
                "notice_id": item.notice_id,
                "notice_title": item.notice.title if item.notice else None,
                "source_reference": item.source_reference,
            }
        )
    return events


@router.get("/action-items")
def list_action_items(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    rows = db.scalars(
        select(ActionItem).join(Notice).where(Notice.user_id == user.id)
    ).all()
    return [
        {
            "id": item.id,
            "title": item.title,
            "description": item.description,
            "due_date": item.due_date.isoformat() if item.due_date else None,
            "status": item.status,
            "priority": item.priority,
            "notice_id": item.notice_id,
        }
        for item in rows
    ]


@router.patch("/action-items/{item_id}")
def update_action_item(
    item_id: str,
    payload: ActionItemUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    item = db.scalar(
        select(ActionItem).join(Notice).where(ActionItem.id == item_id, Notice.user_id == user.id)
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Action item not found.")
    if payload.status is not None:
        item.status = payload.status
    if payload.title is not None:
        item.title = payload.title
    if payload.priority is not None:
        item.priority = payload.priority
    db.commit()
    db.refresh(item)
    return {
        "id": item.id,
        "title": item.title,
        "status": item.status,
        "priority": item.priority,
        "notice_id": item.notice_id,
    }


@router.get("/reminders")
def list_reminders(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    rows = db.scalars(
        select(Reminder).where(Reminder.user_id == user.id).order_by(Reminder.scheduled_at.asc())
    ).all()
    return [
        {
            "id": row.id,
            "title": row.title,
            "scheduled_at": row.scheduled_at,
            "status": row.status,
            "notice_id": row.notice_id,
            "action_item_id": row.action_item_id,
        }
        for row in rows
    ]


@router.post("/reminders", status_code=201)
def create_reminder(
    payload: ReminderCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    if payload.notice_id:
        notice = db.scalar(
            select(Notice).where(Notice.id == payload.notice_id, Notice.user_id == user.id)
        )
        if notice is None:
            raise HTTPException(status_code=404, detail="Notice not found.")
    reminder = Reminder(
        user_id=user.id,
        notice_id=payload.notice_id,
        action_item_id=payload.action_item_id,
        scheduled_at=payload.scheduled_at,
        title=payload.title,
        status="pending",
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return {
        "id": reminder.id,
        "title": reminder.title,
        "scheduled_at": reminder.scheduled_at,
        "status": reminder.status,
        "notice_id": reminder.notice_id,
    }


@router.patch("/reminders/{reminder_id}")
def update_reminder(
    reminder_id: str,
    payload: ReminderUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    reminder = db.scalar(
        select(Reminder).where(Reminder.id == reminder_id, Reminder.user_id == user.id)
    )
    if reminder is None:
        raise HTTPException(status_code=404, detail="Reminder not found.")
    if payload.scheduled_at is not None:
        reminder.scheduled_at = payload.scheduled_at
    if payload.status is not None:
        reminder.status = payload.status
    if payload.title is not None:
        reminder.title = payload.title
    db.commit()
    db.refresh(reminder)
    return {
        "id": reminder.id,
        "title": reminder.title,
        "scheduled_at": reminder.scheduled_at,
        "status": reminder.status,
    }


@router.delete("/reminders/{reminder_id}", status_code=204)
def delete_reminder(
    reminder_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    reminder = db.scalar(
        select(Reminder).where(Reminder.id == reminder_id, Reminder.user_id == user.id)
    )
    if reminder is None:
        raise HTTPException(status_code=404, detail="Reminder not found.")
    db.delete(reminder)
    db.commit()


@router.post("/reminders/process-due")
def process_due_reminders(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """
    Process due reminders for the current user and create in-app notifications.

    Intended to be called by a scheduler/cron. Browser tabs are not required.
    """
    now = datetime.now(timezone.utc)
    due = db.scalars(
        select(Reminder).where(
            Reminder.user_id == user.id,
            Reminder.status == "pending",
            Reminder.scheduled_at <= now,
        )
    ).all()
    created = 0
    for reminder in due:
        reminder.status = "sent"
        db.add(
            Notification(
                user_id=user.id,
                title=reminder.title or "Reminder",
                body="A scheduled Saarthi reminder is due.",
                kind="reminder",
                read=False,
            )
        )
        created += 1
    db.commit()
    return {"processed": created}


@router.get("/notifications")
def list_notifications(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    rows = db.scalars(
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
    ).all()
    return [
        {
            "id": row.id,
            "title": row.title,
            "body": row.body,
            "kind": row.kind,
            "read": row.read,
            "created_at": row.created_at,
        }
        for row in rows
    ]


@router.post("/notifications/{notification_id}/read")
def read_notification(
    notification_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    row = db.scalar(
        select(Notification).where(
            Notification.id == notification_id, Notification.user_id == user.id
        )
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Notification not found.")
    row.read = True
    db.commit()
    return {"id": row.id, "read": True}


@router.post("/notifications/read-all")
def read_all_notifications(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    rows = db.scalars(
        select(Notification).where(Notification.user_id == user.id, Notification.read.is_(False))
    ).all()
    for row in rows:
        row.read = True
    db.commit()
    return {"updated": len(rows)}
