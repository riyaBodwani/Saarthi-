from __future__ import annotations

import json
import os
import re
from typing import Any

from google import genai
from google.genai import types


def _find_sources(answer: str, extracted_text: str, pages: list[dict] | None = None) -> list[dict]:
    sources: list[dict] = []
    normalized = re.sub(r"\s+", " ", extracted_text or "").strip()
    if not normalized:
        return sources
    # Prefer quoted snippets if present.
    for match in re.findall(r"[\"“](.{12,180}?)[\"”]", answer):
        snippet = re.sub(r"\s+", " ", match).strip()
        if snippet and snippet in normalized:
            page_number = None
            for page in pages or []:
                page_text = re.sub(r"\s+", " ", str(page.get("text") or "")).strip()
                if snippet in page_text:
                    page_number = page.get("page_number")
                    break
            sources.append(
                {
                    "evidence_snippet": snippet,
                    "page_number": page_number if isinstance(page_number, int) else None,
                }
            )
    return sources[:5]


def answer_from_notice(
    *,
    question: str,
    language: str,
    extracted_text: str,
    analysis: dict[str, Any] | None,
    pages: list[dict] | None = None,
) -> dict[str, Any]:
    """
    Grounded assistant answer. Uses Gemini when configured; otherwise a
    deterministic local fallback that never invents missing facts.
    """
    context_summary = ""
    if analysis:
        context_summary = json.dumps(
            {
                "summary": analysis.get("summary"),
                "important_dates": analysis.get("important_dates"),
                "action_items": analysis.get("action_items"),
                "eligibility": analysis.get("eligibility"),
                "required_documents": analysis.get("required_documents"),
            },
            ensure_ascii=False,
        )[:4000]

    source_text = (extracted_text or "")[:12000]
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip() or "gemini-2.5-flash"

    if not api_key:
        lowered = question.lower()
        haystack = f"{source_text}\n{context_summary}".lower()
        if any(token in haystack for token in re.findall(r"[a-zA-Z]{4,}", lowered)[:8]):
            content = (
                "I can only confirm details that appear in your notice. "
                "Based on the available extracted text, please review the summary and important dates "
                "in the analysis view. If a specific deadline or requirement is not printed in the notice, "
                "I cannot invent it."
            )
        else:
            content = (
                "I could not find that information in the selected notice. "
                "Please ask about a detail that appears in the document, or open the original extracted text."
            )
        return {"content": content, "sources": _find_sources(content, source_text, pages)}

    system = (
        f"You are Saarthi, a careful academic notice assistant. Reply in {language}. "
        "Use ONLY the provided notice text and structured analysis. "
        "If the answer is not present, say clearly that the notice does not contain that information. "
        "Never invent deadlines, eligibility, fees, or documents. "
        "When quoting, copy exact substrings from the notice."
    )
    prompt = (
        f"NOTICE TEXT:\n{source_text}\n\nSTRUCTURED ANALYSIS:\n{context_summary}\n\n"
        f"QUESTION:\n{question}"
    )
    client = genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=30000))
    try:
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.1,
                system_instruction=system,
            ),
        )
        content = (response.text or "").strip() or (
            "I could not produce an answer from this notice. Please try again."
        )
    finally:
        try:
            client.close()
        except Exception:
            pass
    return {"content": content, "sources": _find_sources(content, source_text, pages)}
