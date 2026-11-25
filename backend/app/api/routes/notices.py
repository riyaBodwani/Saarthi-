from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.notice import ActionItem, Notice, NoticeAnalysis, NoticeDate
from app.models.user import User
from app.schemas.notices import NoticeCreate, NoticeResponse, NoticeUpdate

router = APIRouter(tags=["notices"])


def _serialize_notice(notice: Notice) -> NoticeResponse:
    analysis = notice.analysis.structured_json if notice.analysis else None
    return NoticeResponse(
        id=notice.id,
        title=notice.title,
        original_filename=notice.original_filename,
        document_type=notice.document_type,
        language=notice.language,
        extracted_text=notice.extracted_text,
        page_count=notice.page_count,
        pages=notice.pages_json if isinstance(notice.pages_json, list) else None,
        favorite=notice.favorite,
        created_at=notice.created_at,
        summary=notice.analysis.summary if notice.analysis else None,
        analysis=analysis,
        dates=[
            {
                "id": item.id,
                "label": item.event_name,
                "date": item.date_text,
                "type": item.category,
                "urgency": item.urgency,
                "normalized_date": item.normalized_date.isoformat() if item.normalized_date else None,
                "source_reference": item.source_reference,
            }
            for item in notice.dates
        ],
        action_items=[
            {
                "id": item.id,
                "title": item.title,
                "description": item.description,
                "due_date": item.due_date.isoformat() if item.due_date else None,
                "status": item.status,
                "priority": item.priority,
            }
            for item in notice.action_items
        ],
    )


def _get_owned_notice(db: Session, user: User, notice_id: str) -> Notice:
    notice = db.scalar(
        select(Notice)
        .where(Notice.id == notice_id, Notice.user_id == user.id)
        .options(
            selectinload(Notice.analysis),
            selectinload(Notice.dates),
            selectinload(Notice.action_items),
        )
    )
    if notice is None:
        raise HTTPException(status_code=404, detail="Notice not found.")
    return notice


@router.post("/notices", response_model=NoticeResponse, status_code=201)
def create_notice(
    payload: NoticeCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> NoticeResponse:
    analysis_data = payload.analysis or {}
    notice = Notice(
        user_id=user.id,
        title=payload.title,
        original_filename=payload.original_filename,
        document_type=payload.document_type or analysis_data.get("document_type") or "Notice",
        language=payload.language,
        extracted_text=payload.extracted_text,
        page_count=payload.page_count,
        pages_json=payload.pages,
        favorite=payload.favorite,
    )
    db.add(notice)
    db.flush()

    db.add(
        NoticeAnalysis(
            notice_id=notice.id,
            summary=analysis_data.get("summary") or "",
            detailed_summary=analysis_data.get("detailed_summary") or "",
            structured_json=analysis_data,
            urgency=analysis_data.get("overall_urgency") or "unknown",
        )
    )

    for item in analysis_data.get("important_dates") or []:
        normalized = None
        raw = item.get("normalized_date")
        if isinstance(raw, str) and raw:
            try:
                normalized = date.fromisoformat(raw)
            except ValueError:
                normalized = None
        db.add(
            NoticeDate(
                notice_id=notice.id,
                date_text=item.get("original_date") or item.get("date") or "",
                event_name=item.get("label") or "Date",
                category=item.get("type") or "unknown",
                urgency=item.get("urgency"),
                normalized_date=normalized,
                source_reference=item.get("context"),
            )
        )

    for action in analysis_data.get("action_items") or []:
        title = action if isinstance(action, str) else action.get("title")
        if not title:
            continue
        db.add(
            ActionItem(
                notice_id=notice.id,
                title=title,
                description="" if isinstance(action, str) else action.get("description") or "",
                status="pending",
            )
        )

    db.commit()
    notice = _get_owned_notice(db, user, notice.id)
    return _serialize_notice(notice)


@router.get("/notices", response_model=list[NoticeResponse])
def list_notices(
    q: str | None = None,
    category: str | None = None,
    urgency: str | None = None,
    sort: str = Query(default="newest"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[NoticeResponse]:
    stmt = (
        select(Notice)
        .where(Notice.user_id == user.id)
        .options(
            selectinload(Notice.analysis),
            selectinload(Notice.dates),
            selectinload(Notice.action_items),
        )
    )
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(Notice.title.ilike(like), Notice.extracted_text.ilike(like)))
    if category and category != "all":
        stmt = stmt.where(Notice.document_type == category)
    if urgency and urgency != "all":
        stmt = stmt.join(NoticeAnalysis).where(NoticeAnalysis.urgency == urgency)
    stmt = stmt.order_by(Notice.created_at.asc() if sort == "oldest" else Notice.created_at.desc())
    notices = db.scalars(stmt).unique().all()
    return [_serialize_notice(notice) for notice in notices]


@router.get("/notices/{notice_id}", response_model=NoticeResponse)
def get_notice(
    notice_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> NoticeResponse:
    return _serialize_notice(_get_owned_notice(db, user, notice_id))


@router.patch("/notices/{notice_id}", response_model=NoticeResponse)
def update_notice(
    notice_id: str,
    payload: NoticeUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> NoticeResponse:
    notice = _get_owned_notice(db, user, notice_id)
    if payload.title is not None:
        notice.title = payload.title
    if payload.favorite is not None:
        notice.favorite = payload.favorite
    if payload.document_type is not None:
        notice.document_type = payload.document_type
    db.commit()
    return _serialize_notice(_get_owned_notice(db, user, notice_id))


@router.delete("/notices/{notice_id}", status_code=204)
def delete_notice(
    notice_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    notice = _get_owned_notice(db, user, notice_id)
    db.delete(notice)
    db.commit()


@router.get("/dashboard/stats")
def dashboard_stats(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    notices = db.scalars(
        select(Notice)
        .where(Notice.user_id == user.id)
        .options(
            selectinload(Notice.analysis),
            selectinload(Notice.dates),
            selectinload(Notice.action_items),
        )
    ).unique().all()
    upcoming = []
    pending_actions = 0
    high_priority = 0
    for notice in notices:
        pending_actions += sum(1 for item in notice.action_items if item.status != "completed")
        if notice.analysis and notice.analysis.urgency in {"overdue", "due_today", "urgent"}:
            high_priority += 1
        for item in notice.dates:
            if item.category != "deadline" or not item.normalized_date:
                continue
            if item.urgency == "overdue":
                continue
            upcoming.append(
                {
                    "notice_id": notice.id,
                    "notice_title": notice.title,
                    "title": item.event_name,
                    "date": item.normalized_date.isoformat(),
                    "category": item.category,
                    "urgency": item.urgency,
                }
            )
    upcoming.sort(key=lambda row: row["date"])
    return {
        "total_notices": len(notices),
        "upcoming_deadlines": len(upcoming),
        "pending_actions": pending_actions,
        "high_priority_notices": high_priority,
        "upcoming": upcoming[:10],
    }
