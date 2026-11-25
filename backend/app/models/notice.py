from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import JSON, Boolean, Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Notice(Base):
    __tablename__ = "notices"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), default="")
    document_type: Mapped[str] = mapped_column(String(80), default="Notice", index=True)
    language: Mapped[str] = mapped_column(String(32), default="english")
    extracted_text: Mapped[str] = mapped_column(Text, default="")
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pages_json: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    favorite: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user = relationship("User", back_populates="notices")
    analysis = relationship(
        "NoticeAnalysis", back_populates="notice", uselist=False, cascade="all, delete-orphan"
    )
    dates = relationship("NoticeDate", back_populates="notice", cascade="all, delete-orphan")
    action_items = relationship("ActionItem", back_populates="notice", cascade="all, delete-orphan")


class NoticeAnalysis(Base):
    __tablename__ = "notice_analyses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    notice_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("notices.id", ondelete="CASCADE"), unique=True, index=True
    )
    summary: Mapped[str] = mapped_column(Text, default="")
    detailed_summary: Mapped[str] = mapped_column(Text, default="")
    structured_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    urgency: Mapped[str] = mapped_column(String(32), default="unknown", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    notice = relationship("Notice", back_populates="analysis")


class NoticeDate(Base):
    __tablename__ = "notice_dates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    notice_id: Mapped[str] = mapped_column(String(36), ForeignKey("notices.id", ondelete="CASCADE"), index=True)
    date_text: Mapped[str] = mapped_column(String(120), default="")
    event_name: Mapped[str] = mapped_column(String(255), default="")
    category: Mapped[str] = mapped_column(String(64), default="unknown", index=True)
    priority: Mapped[str] = mapped_column(String(32), default="normal")
    source_reference: Mapped[str | None] = mapped_column(Text, nullable=True)
    urgency: Mapped[str | None] = mapped_column(String(32), nullable=True)
    normalized_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)

    notice = relationship("Notice", back_populates="dates")


class ActionItem(Base):
    __tablename__ = "action_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    notice_id: Mapped[str] = mapped_column(String(36), ForeignKey("notices.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="pending", index=True)
    priority: Mapped[str] = mapped_column(String(32), default="normal")

    notice = relationship("Notice", back_populates="action_items")
