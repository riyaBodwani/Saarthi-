import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildActionItemsText,
  buildAnalysisMarkdown,
} from "./analysisExport.js";

describe("analysisExport", () => {
  it("builds markdown from real analysis fields only", () => {
    const markdown = buildAnalysisMarkdown({
      title: "Exam form",
      filename: "exam.pdf",
      language: "english",
      category: "Examination",
      uploadedAt: "2026-11-24T10:00:00.000Z",
      analysis: {
        summary: "Submit the exam form soon.",
        detailed_summary: "Students must submit the form with fees.",
        key_points: ["Submit form", "Pay fee", "Carry ID"],
        important_dates: [
          { label: "Last date", date: "30 Nov 2026", type: "deadline" },
        ],
        action_items: ["Submit form", "Pay fee"],
        eligibility: ["Final year students"],
        required_documents: [],
        fees: ["Rs 500"],
        contacts: [],
      },
    });

    assert.match(markdown, /# Exam form/);
    assert.match(markdown, /Submit the exam form soon/);
    assert.match(markdown, /## Action items/);
    assert.match(markdown, /Final year students/);
    assert.doesNotMatch(markdown, /Required documents/);
  });

  it("handles missing action items honestly", () => {
    assert.equal(
      buildActionItemsText({ analysis: { action_items: [] } }),
      "No action items were extracted from this notice."
    );
  });
});
