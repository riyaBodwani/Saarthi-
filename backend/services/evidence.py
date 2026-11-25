"""Evidence grounding helpers for notice analysis claims."""

from __future__ import annotations

import re
from typing import Any


def normalize_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def find_snippet_in_source(snippet: str, source_text: str) -> str | None:
    """Return the source-normalized snippet if it appears in the source text."""
    needle = normalize_whitespace(snippet)
    haystack = normalize_whitespace(source_text)
    if not needle or not haystack:
        return None
    if needle in haystack:
        return needle
    return None


def locate_page_number(
    snippet: str,
    pages: list[dict[str, Any]] | None,
) -> int | None:
    """
    Return 1-based page number when the snippet appears on exactly one page
    or the first matching page. Never invent a page when pages are missing.
    """
    if not pages:
        return None
    needle = normalize_whitespace(snippet)
    if not needle:
        return None
    for page in pages:
        page_text = normalize_whitespace(str(page.get("text") or ""))
        page_number = page.get("page_number")
        if not page_text or not isinstance(page_number, int):
            continue
        if needle in page_text:
            return page_number
    return None


def build_evidence_item(
    *,
    claim: str,
    evidence_snippet: str | None,
    source_text: str,
    pages: list[dict[str, Any]] | None = None,
    category: str = "general",
) -> dict[str, Any]:
    """
    Build a grounded evidence record.

    Verification is true only when the evidence snippet is present in the
    original extracted text. Unsupported claims are never marked verified.
    """
    claim_text = normalize_whitespace(claim)
    raw_snippet = normalize_whitespace(evidence_snippet or "")
    matched = find_snippet_in_source(raw_snippet, source_text) if raw_snippet else None
    page_number = locate_page_number(matched, pages) if matched else None
    return {
        "claim": claim_text,
        "evidence_snippet": matched,
        "page_number": page_number,
        "page_available": page_number is not None,
        "category": category,
        "verification_status": "verified" if matched else "unverified",
    }


def ground_evidence_list(
    items: list[dict[str, Any]] | None,
    source_text: str,
    pages: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    grounded: list[dict[str, Any]] = []
    for item in items or []:
        if not isinstance(item, dict):
            continue
        claim = item.get("claim") or item.get("text") or ""
        snippet = item.get("evidence_snippet") or item.get("evidence") or ""
        category = item.get("category") or "general"
        if not normalize_whitespace(str(claim)):
            continue
        grounded.append(
            build_evidence_item(
                claim=str(claim),
                evidence_snippet=str(snippet) if snippet else None,
                source_text=source_text,
                pages=pages,
                category=str(category),
            )
        )
    return grounded


def pages_from_texts(page_texts: list[str]) -> list[dict[str, Any]]:
    return [
        {"page_number": index + 1, "text": text or ""}
        for index, text in enumerate(page_texts)
    ]
