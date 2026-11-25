import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Download,
  FileSearch,
  Printer,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { useApp } from "../hooks/useApp";
import {
  buildActionItemsText,
  buildAnalysisMarkdown,
  copyText,
  downloadAnalysisMarkdown,
  printAnalysis,
} from "../services/analysisExport";

const urgencyTone = {
  overdue: "danger",
  due_today: "gold",
  urgent: "warning",
  upcoming: "mint",
  later: "neutral",
  unknown: "neutral",
};

function dateTypeLabel(type) {
  switch (type) {
    case "deadline":
      return "Submission deadline";
    case "event":
      return "Event / examination";
    case "informational":
      return "Informational date";
    default:
      return "Unknown";
  }
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "—";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Section({ id, title, children, className = "" }) {
  return (
    <Card id={id} className={`analysis-section scroll-mt-24 ${className}`}>
      <CardHeader>
        <h3 className="font-editorial text-2xl text-ink dark:text-canvas">{title}</h3>
      </CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  );
}

export default function AnalysisPage() {
  const { activeNotice, setView, openAssistantForNotice } = useApp();
  const [copyStatus, setCopyStatus] = useState("");
  const [showOriginal, setShowOriginal] = useState(false);
  const [activeEvidence, setActiveEvidence] = useState(null);

  const analysis = activeNotice?.analysis;
  const evidence = useMemo(
    () => (Array.isArray(analysis?.evidence) ? analysis.evidence : []),
    [analysis]
  );
  const deadlines = useMemo(
    () =>
      (analysis?.important_dates || []).filter((item) => item.type === "deadline"),
    [analysis]
  );

  const originalText = activeNotice?.extraction?.text || "";
  const highlightedOriginal = useMemo(() => {
    const snippet = activeEvidence?.evidence_snippet;
    if (!snippet || !originalText.includes(snippet)) return null;
    const parts = originalText.split(snippet);
    return (
      <>
        {parts.map((part, index) => (
          <span key={index}>
            {part}
            {index < parts.length - 1 && (
              <mark className="evidence-mark">{snippet}</mark>
            )}
          </span>
        ))}
      </>
    );
  }, [activeEvidence, originalText]);

  if (!activeNotice || !analysis) {
    return (
      <EmptyState
        icon={FileSearch}
        title="No analysis selected"
        description="Upload and analyze a notice, or open one from My Notices."
        actionLabel="Upload Notice"
        onAction={() => setView("upload")}
      />
    );
  }

  async function handleCopy(kind) {
    try {
      if (kind === "summary") {
        await copyText(analysis.summary || "");
        setCopyStatus("Summary copied");
      } else if (kind === "actions") {
        await copyText(buildActionItemsText(activeNotice));
        setCopyStatus("Action items copied");
      } else {
        await copyText(buildAnalysisMarkdown(activeNotice));
        setCopyStatus("Full analysis copied");
      }
    } catch (error) {
      setCopyStatus(error instanceof Error ? error.message : "Copy failed");
    }
  }

  function handleDownload() {
    downloadAnalysisMarkdown(activeNotice);
    setCopyStatus("Markdown downloaded — use Print for PDF");
  }

  function inspectEvidence(item) {
    setActiveEvidence(item);
    setShowOriginal(true);
    const target = document.getElementById("original-text-panel");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const lists = [
    ["Eligibility requirements", analysis.eligibility],
    ["Required documents", analysis.required_documents],
    ["Fees", analysis.fees],
    ["Contact information", analysis.contacts],
  ];

  const navItems = [
    { id: "summary", label: "Summary" },
    { id: "announcements", label: "Announcements" },
    { id: "dates", label: "Dates" },
    { id: "actions", label: "Actions" },
    { id: "evidence", label: "Evidence" },
    { id: "original", label: "Original text" },
  ];

  return (
    <div className="slide-up">
      <PageHeader
        eyebrow="Document intelligence"
        title={activeNotice.title}
        description={`${activeNotice.filename || "Notice"} · ${formatDateTime(activeNotice.uploadedAt)}`}
        actions={
          <div className="no-print flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => setView("notices")}>
              <ArrowLeft className="size-4" />
              Notices
            </Button>
            <Button
              size="sm"
              onClick={() => openAssistantForNotice?.(activeNotice.id)}
            >
              <Sparkles className="size-3.5" />
              Ask Saarthi
            </Button>
          </div>
        }
      />

      <div className="no-print mb-5 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => handleCopy("summary")}>
          <Copy className="size-3.5" />
          Copy summary
        </Button>
        <Button variant="secondary" size="sm" onClick={() => handleCopy("actions")}>
          <Copy className="size-3.5" />
          Copy actions
        </Button>
        <Button variant="secondary" size="sm" onClick={handleDownload}>
          <Download className="size-3.5" />
          Download
        </Button>
        <Button variant="secondary" size="sm" onClick={() => printAnalysis()}>
          <Printer className="size-3.5" />
          Print / PDF
        </Button>
      </div>

      {copyStatus && (
        <p role="status" className="no-print mb-4 text-sm text-ink-muted dark:text-mint/65">
          {copyStatus}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <Section id="summary" title="AI summary">
            <p className="text-[1.05rem] leading-[1.75] whitespace-pre-wrap text-ink dark:text-canvas">
              {analysis.summary}
            </p>
            {analysis.detailed_summary && (
              <div className="mt-5 border-t border-border/80 pt-5 dark:border-mint/10">
                <h4 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint">
                  Detailed summary
                </h4>
                <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-ink-muted dark:text-mint/70">
                  {analysis.detailed_summary}
                </p>
              </div>
            )}
          </Section>

          {Array.isArray(analysis.key_points) && analysis.key_points.length > 0 && (
            <Section id="announcements" title="Key announcements">
              <ul className="list-disc space-y-2 pl-5 text-base leading-relaxed">
                {analysis.key_points.map((point, index) => (
                  <li key={`${index}-${point}`}>{point}</li>
                ))}
              </ul>
            </Section>
          )}

          {Array.isArray(analysis.important_dates) &&
            analysis.important_dates.length > 0 && (
              <Section id="dates" title="Important dates">
                <ul className="space-y-3">
                  {analysis.important_dates.map((item, index) => (
                    <li
                      key={`${index}-${item.label}-${item.date}`}
                      className={`rounded-xl border px-4 py-3 ${
                        item.type === "deadline"
                          ? "border-gold/40 bg-gold-soft/40 dark:border-gold/25 dark:bg-gold/10"
                          : "border-border dark:border-mint/12"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{item.label}</p>
                        <Badge tone="neutral">{dateTypeLabel(item.type)}</Badge>
                        {item.verified === false && (
                          <Badge tone="warning">Unverified</Badge>
                        )}
                        {item.urgency && item.type === "deadline" && (
                          <Badge tone={urgencyTone[item.urgency] || "neutral"}>
                            {String(item.urgency).replace("_", " ")}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm">
                        {item.original_date || item.date}
                        {item.page_available
                          ? ` · Page ${item.page_number}`
                          : " · Page unavailable"}
                      </p>
                      {item.context && (
                        <p className="mt-1 text-sm text-ink-muted dark:text-mint/65">
                          {item.context}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

          {Array.isArray(analysis.action_items) && analysis.action_items.length > 0 && (
            <Section id="actions" title="Required actions">
              <ul className="space-y-2">
                {analysis.action_items.map((item, index) => (
                  <li
                    key={`${index}-${item}`}
                    className="flex items-start gap-2 rounded-xl border border-border px-3 py-2.5 dark:border-mint/12"
                  >
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-forest dark:text-mint" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {lists.map(([title, values]) => {
            if (!Array.isArray(values) || values.length === 0) return null;
            return (
              <Section key={title} title={title}>
                <ul className="list-disc space-y-2 pl-5">
                  {values.map((item, index) => (
                    <li key={`${title}-${index}`}>{item}</li>
                  ))}
                </ul>
              </Section>
            );
          })}

          <Section id="evidence" title="Source evidence">
            {evidence.length === 0 ? (
              <p className="text-sm text-ink-muted dark:text-mint/65">
                No evidence snippets were returned. Verify findings against the original
                extracted text.
              </p>
            ) : (
              <ul className="space-y-3">
                {evidence.map((item, index) => (
                  <li
                    key={`${index}-${item.claim}`}
                    className="rounded-xl border border-border px-4 py-3 dark:border-mint/12"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{item.claim}</p>
                      <Badge
                        tone={
                          item.verification_status === "verified" ? "mint" : "warning"
                        }
                      >
                        {item.verification_status}
                      </Badge>
                      <Badge tone="neutral">{item.category}</Badge>
                    </div>
                    {item.evidence_snippet ? (
                      <button
                        type="button"
                        onClick={() => inspectEvidence(item)}
                        className="mt-2 block w-full rounded-xl border-l-2 border-gold/70 bg-stone/60 px-3 py-2.5 text-left text-sm italic leading-relaxed text-ink-muted transition-colors duration-150 hover:bg-gold-soft/50 dark:bg-forest-deep/50 dark:text-mint/70 dark:hover:bg-gold/10"
                      >
                        “{item.evidence_snippet}”
                      </button>
                    ) : (
                      <p className="mt-2 flex items-center gap-2 text-sm text-ink-muted">
                        <ShieldAlert className="size-4" />
                        Supporting quotation unavailable in source text.
                      </p>
                    )}
                    <p className="mt-2 text-xs text-ink-muted dark:text-mint/55">
                      {item.page_available
                        ? `Page ${item.page_number}`
                        : "Page number unavailable"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section id="original" title="Original extracted text">
            <div className="no-print mb-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowOriginal((value) => !value)}
              >
                {showOriginal ? "Hide original text" : "Show original text"}
              </Button>
            </div>
            {(showOriginal || typeof window === "undefined") && (
              <pre
                id="original-text-panel"
                className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-border bg-canvas p-4 text-sm leading-relaxed dark:border-mint/12 dark:bg-forest-deep print:max-h-none"
              >
                {highlightedOriginal || originalText || "Original text unavailable."}
              </pre>
            )}
          </Section>
        </div>

        <aside className="no-print space-y-4 xl:sticky xl:top-20 xl:self-start">
          <Card>
            <CardHeader>
              <h3 className="font-editorial text-xl text-ink dark:text-canvas">Overview</h3>
            </CardHeader>
            <CardBody className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-muted">Urgency</span>
                <Badge tone={urgencyTone[analysis.overall_urgency] || "neutral"}>
                  {(analysis.overall_urgency || "unknown").replace("_", " ")}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-muted">Type</span>
                <span className="font-medium">
                  {activeNotice.category || analysis.document_type || "Notice"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-muted">Language</span>
                <span className="font-medium capitalize">{activeNotice.language}</span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-editorial text-xl text-ink dark:text-canvas">Key deadlines</h3>
            </CardHeader>
            <CardBody className="space-y-2">
              {deadlines.length === 0 ? (
                <p className="text-sm text-ink-muted">No deadline dates extracted.</p>
              ) : (
                deadlines.slice(0, 5).map((item, index) => (
                  <div
                    key={`side-deadline-${index}`}
                    className="rounded-lg border border-border px-3 py-2 dark:border-mint/12"
                  >
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="text-xs text-ink-muted">
                      {item.original_date || item.date}
                    </p>
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-editorial text-xl text-ink dark:text-canvas">
                Action checklist
              </h3>
            </CardHeader>
            <CardBody className="space-y-2">
              {(analysis.action_items || []).length === 0 ? (
                <p className="text-sm text-ink-muted">No action items extracted.</p>
              ) : (
                (analysis.action_items || []).map((item, index) => (
                  <div
                    key={`side-action-${index}`}
                    className="flex items-start gap-2 text-sm"
                  >
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-forest dark:text-mint" />
                    <span>{item}</span>
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-editorial text-xl text-ink dark:text-canvas">On this page</h3>
            </CardHeader>
            <CardBody className="space-y-1">
              {navItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id === "original" ? "original" : item.id}`}
                  className="block rounded-xl px-3 py-2 text-sm text-ink-muted transition-colors duration-150 hover:bg-stone hover:text-ink dark:hover:bg-forest-deep dark:hover:text-canvas"
                >
                  {item.label}
                </a>
              ))}
            </CardBody>
          </Card>
        </aside>
      </div>

      <p className="mt-6 text-xs text-ink-muted dark:text-mint/55">
        AI explanations can be inaccurate. Check dates, eligibility, and requirements
        against the original notice before acting.
      </p>
    </div>
  );
}
