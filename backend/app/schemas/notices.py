from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class NoticeCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    original_filename: str = ""
    document_type: str = "Notice"
    language: str = "english"
    extracted_text: str = ""
    page_count: int | None = None
    pages: list[dict[str, Any]] | None = None
    analysis: dict[str, Any] | None = None
    favorite: bool = False


class NoticeUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    favorite: bool | None = None
    document_type: str | None = None


class NoticeResponse(BaseModel):
    id: str
    title: str
    original_filename: str
    document_type: str
    language: str
    extracted_text: str
    page_count: int | None
    pages: list[dict[str, Any]] | None = None
    favorite: bool
    created_at: datetime | None = None
    summary: str | None = None
    analysis: dict[str, Any] | None = None
    dates: list[dict[str, Any]] = []
    action_items: list[dict[str, Any]] = []
