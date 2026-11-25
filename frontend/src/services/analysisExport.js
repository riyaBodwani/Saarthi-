function asList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

export function buildAnalysisMarkdown(notice) {
  if (!notice) return "";
  const analysis = notice.analysis || {};
  const lines = [
    `# ${notice.title || "Notice analysis"}`,
    "",
    `Filename: ${notice.filename || "—"}`,
    `Language: ${notice.language || "—"}`,
    `Document type: ${notice.category || analysis.document_type || "Notice"}`,
    `Uploaded: ${notice.uploadedAt || "—"}`,
    "",
    "## Summary",
    analysis.summary || "—",
    "",
  ];

  if (analysis.detailed_summary) {
    lines.push("## Detailed summary", analysis.detailed_summary, "");
  }

  const keyPoints = asList(analysis.key_points);
  if (keyPoints.length) {
    lines.push("## Key announcements");
    keyPoints.forEach((point) => lines.push(`- ${point}`));
    lines.push("");
  }

  const dates = asList(analysis.important_dates);
  if (dates.length) {
    lines.push("## Important dates");
    dates.forEach((item) => {
      lines.push(
        `- ${item.label}: ${item.original_date || item.date} (${item.type || "unknown"})`
      );
    });
    lines.push("");
  }

  const actions = asList(analysis.action_items);
  if (actions.length) {
    lines.push("## Action items");
    actions.forEach((item) => lines.push(`- ${item}`));
    lines.push("");
  }

  [
    ["Eligibility", analysis.eligibility],
    ["Required documents", analysis.required_documents],
    ["Fees", analysis.fees],
    ["Contacts", analysis.contacts],
  ].forEach(([heading, values]) => {
    const items = asList(values);
    if (!items.length) return;
    lines.push(`## ${heading}`);
    items.forEach((item) => lines.push(`- ${item}`));
    lines.push("");
  });

  lines.push(
    "_AI explanations can be inaccurate. Verify against the original notice._"
  );
  return lines.join("\n");
}

export function buildActionItemsText(notice) {
  const items = asList(notice?.analysis?.action_items);
  if (!items.length) return "No action items were extracted from this notice.";
  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

export async function copyText(value) {
  const text = typeof value === "string" ? value : "";
  if (!text) {
    throw new Error("Nothing to copy.");
  }
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  throw new Error("Clipboard is not available in this browser.");
}

export function downloadTextFile(filename, content, mimeType = "text/plain") {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function downloadAnalysisMarkdown(notice) {
  const markdown = buildAnalysisMarkdown(notice);
  const safeName = String(notice?.title || "saarthi-analysis")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
  downloadTextFile(`${safeName || "saarthi-analysis"}.md`, markdown, "text/markdown");
  return markdown;
}

export function printAnalysis() {
  if (typeof window === "undefined") {
    throw new Error("Printing is only available in the browser.");
  }
  window.print();
}
