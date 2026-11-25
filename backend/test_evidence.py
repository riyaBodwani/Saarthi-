"""Unit tests for evidence grounding helpers."""

from services.evidence import (
    build_evidence_item,
    find_snippet_in_source,
    ground_evidence_list,
    locate_page_number,
    pages_from_texts,
)


def test_find_snippet_requires_source_match():
    source = "Submit the form by 30 November 2026 at the office."
    assert find_snippet_in_source("30 November 2026", source) == "30 November 2026"
    assert find_snippet_in_source("31 November 2026", source) is None


def test_locate_page_number_never_invents_pages():
    pages = pages_from_texts(
        [
            "College notice header",
            "Submit the form by 30 November 2026",
        ]
    )
    assert locate_page_number("30 November 2026", pages) == 2
    assert locate_page_number("missing quote", pages) is None
    assert locate_page_number("30 November 2026", None) is None


def test_unverified_when_snippet_absent():
    item = build_evidence_item(
        claim="Fee is Rs 500",
        evidence_snippet="Fee is Rs 500",
        source_text="No fee mentioned in this circular.",
        pages=pages_from_texts(["No fee mentioned in this circular."]),
        category="fees",
    )
    assert item["verification_status"] == "unverified"
    assert item["evidence_snippet"] is None
    assert item["page_number"] is None
    assert item["page_available"] is False


def test_verified_with_page_when_supported():
    source_pages = pages_from_texts(
        ["Eligibility: only final year students.", "Bring Aadhaar card."]
    )
    source = "\n".join(page["text"] for page in source_pages)
    item = build_evidence_item(
        claim="Only final year students are eligible",
        evidence_snippet="Eligibility: only final year students.",
        source_text=source,
        pages=source_pages,
        category="eligibility",
    )
    assert item["verification_status"] == "verified"
    assert item["page_number"] == 1
    assert item["page_available"] is True


def test_ground_evidence_list_skips_empty_claims():
    grounded = ground_evidence_list(
        [
            {"claim": "", "evidence_snippet": "x"},
            {
                "claim": "Bring Aadhaar card",
                "evidence_snippet": "Bring Aadhaar card",
                "category": "documents",
            },
        ],
        "Bring Aadhaar card tomorrow.",
        pages_from_texts(["Bring Aadhaar card tomorrow."]),
    )
    assert len(grounded) == 1
    assert grounded[0]["verification_status"] == "verified"


if __name__ == "__main__":
    test_find_snippet_requires_source_match()
    test_locate_page_number_never_invents_pages()
    test_unverified_when_snippet_absent()
    test_verified_with_page_when_supported()
    test_ground_evidence_list_skips_empty_claims()
    print("test_evidence.py: all passed")
