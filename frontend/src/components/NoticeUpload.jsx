import { useEffect, useReducer, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  FileCheck2,
  FileText,
  Globe,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { apiUrl } from "../config/api";
import {
  formatFileSize,
  isImageFile,
  isPdfFile,
  validateNoticeFile,
} from "../services/noticeFile";
import {
  isUrgencyStale,
  sortDeadlines,
  sortEventDates,
} from "../services/deadlineUtils";
import { ANALYSIS_MAX_ATTEMPTS } from "../services/analysisRequest";
import {
  hasUsableExtraction,
  acquireNoticeWorkflow,
  NoticeExtractionError,
  runNoticeAnalysis,
} from "../services/noticeWorkflow";
import {
  initialOriginalTextState,
  originalTextReducer,
} from "../services/originalTextState";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { ProgressSteps } from "./ui/ProgressSteps";

const languages = [
  { id: "english", label: "English", nativeLabel: "English" },
  { id: "hindi", label: "Hindi", nativeLabel: "हिन्दी" },
  { id: "marathi", label: "Marathi", nativeLabel: "मराठी" },
];

const PROCESSING_STEPS = [
  { id: "uploading", label: "Uploading document" },
  { id: "extracting", label: "Extracting text" },
  { id: "detecting", label: "Detecting language" },
  { id: "understanding", label: "Understanding notice" },
  { id: "dates", label: "Extracting important dates" },
  { id: "preparing", label: "Preparing results" },
];

const urgencyLabels = {
  overdue: "Overdue",
  due_today: "Due Today",
  urgent: "Urgent",
  upcoming: "Upcoming",
  later: "Later",
  unknown: "Date Unverified",
};

const urgencyStyles = {
  overdue:
    "border-danger/30 bg-danger-soft text-danger dark:border-red-400/40 dark:bg-red-950/30 dark:text-red-200",
  due_today: "border-mint/50 bg-mint text-forest",
  urgent:
    "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-400/40 dark:bg-amber-950/30 dark:text-amber-100",
  upcoming:
    "border-border bg-canvas text-ink dark:border-mint/25 dark:bg-forest-deep dark:text-canvas",
  later: "border-border bg-transparent text-ink-muted dark:border-mint/20 dark:text-mint/65",
  unknown: "border-border bg-transparent text-ink-muted dark:border-mint/20 dark:text-mint/65",
  refresh: "border-border bg-transparent text-ink-muted dark:border-mint/20 dark:text-mint/65",
};

function stageToProgressIndex(stage) {
  if (stage === "extracting") return 1;
  if (stage === "analyzing") return 3;
  if (stage === "retrying") return 3;
  return -1;
}

function dateTypeLabel(type) {
  if (type === "deadline") return "Submission deadline";
  if (type === "event") return "Event";
  if (type === "informational") return "Informational date";
  if (type === "unknown") return "Unknown";
  return type || "Unknown";
}

function NoticeUpload({ language, onLanguageChange, onAnalysisComplete }) {
  const inputRef = useRef(null);
  const dropZoneRef = useRef(null);
  const previewUrlRef = useRef(null);
  const pipelineRequestRef = useRef(0);
  const pipelineControllerRef = useRef(null);
  const isPipelineRunningRef = useRef(false);
  const pipelineStageRef = useRef(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [originalTextState, dispatchOriginalText] = useReducer(
    originalTextReducer,
    initialOriginalTextState
  );
  const extractionResult = originalTextState.result;
  const [extractionError, setExtractionError] = useState(null);

  const [isPipelineRunning, setIsPipelineRunning] = useState(false);
  const [pipelineStage, setPipelineStage] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const [analysisRetryAttempt, setAnalysisRetryAttempt] = useState(null);
  const [deadlineClock, setDeadlineClock] = useState(() => new Date());

  const urgencyCalculatedOn = analysisResult?.urgency_calculated_on;
  const deadlineStatusStale =
    Boolean(urgencyCalculatedOn) && isUrgencyStale(urgencyCalculatedOn, deadlineClock);
  const deadlineDates = sortDeadlines(analysisResult?.important_dates);
  const eventDates = sortEventDates(analysisResult?.important_dates);
  const progressIndex = stageToProgressIndex(pipelineStage);

  useEffect(() => {
    if (!urgencyCalculatedOn) return undefined;
    const intervalId = window.setInterval(() => setDeadlineClock(new Date()), 60_000);
    return () => window.clearInterval(intervalId);
  }, [urgencyCalculatedOn]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      pipelineControllerRef.current?.abort();
    };
  }, []);

  function clearPreviewUrl() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
  }

  function resetInput() {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function cancelPipeline() {
    pipelineRequestRef.current += 1;
    pipelineControllerRef.current?.abort();
    pipelineControllerRef.current = null;
    isPipelineRunningRef.current = false;
    pipelineStageRef.current = null;
    setIsPipelineRunning(false);
    setPipelineStage(null);
    setAnalysisRetryAttempt(null);
  }

  function clearAnalysisState() {
    setAnalysisResult(null);
    setAnalysisError(null);
  }

  function clearExtractionState() {
    cancelPipeline();
    clearAnalysisState();
    dispatchOriginalText({ type: "fileChanged" });
    setExtractionError(null);
  }

  function handleLanguageChange(nextLanguage) {
    if (nextLanguage !== language) {
      const extractionInProgress = pipelineStageRef.current === "extracting";
      cancelPipeline();
      if (extractionInProgress) {
        dispatchOriginalText({ type: "extractionStarted" });
      }
      dispatchOriginalText({ type: "languageChanged" });
      clearAnalysisState();
      onLanguageChange(nextLanguage);
    }
  }

  function applyFile(nextFile) {
    const result = validateNoticeFile(nextFile);
    if (!result.ok) {
      clearPreviewUrl();
      setFile(null);
      setError(result.message);
      resetInput();
      clearExtractionState();
      return;
    }
    setError("");
    clearPreviewUrl();
    clearExtractionState();
    if (isImageFile(nextFile)) {
      const url = URL.createObjectURL(nextFile);
      previewUrlRef.current = url;
      setPreviewUrl(url);
    }
    setFile(nextFile);
  }

  function onInputChange(event) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    applyFile(selected);
  }

  function onDragOver(event) {
    event.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave(event) {
    event.preventDefault();
    setIsDragging(false);
  }

  function onDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    const dropped = event.dataTransfer.files;
    if (!dropped?.length) return;
    if (dropped.length > 1) {
      clearPreviewUrl();
      setFile(null);
      setError("Please add one notice at a time.");
      resetInput();
      clearExtractionState();
      return;
    }
    applyFile(dropped[0]);
  }

  function clearFile() {
    clearPreviewUrl();
    setFile(null);
    setError("");
    resetInput();
    clearExtractionState();
    if (dropZoneRef.current) {
      dropZoneRef.current.focus();
    }
  }

  async function handleAnalyze() {
    if (
      !file ||
      (!isPdfFile(file) && !isImageFile(file)) ||
      !acquireNoticeWorkflow(isPipelineRunningRef)
    ) {
      return;
    }

    const cachedExtraction = hasUsableExtraction(extractionResult)
      ? extractionResult
      : null;
    if (!cachedExtraction) {
      dispatchOriginalText({ type: "extractionStarted" });
      setExtractionError(null);
    }
    clearAnalysisState();

    const requestId = pipelineRequestRef.current + 1;
    pipelineRequestRef.current = requestId;
    const controller = new AbortController();
    pipelineControllerRef.current = controller;
    const initialStage = cachedExtraction ? "analyzing" : "extracting";
    pipelineStageRef.current = initialStage;
    setPipelineStage(initialStage);
    setIsPipelineRunning(true);
    setAnalysisError(null);
    setAnalysisRetryAttempt(null);

    try {
      const params = new URLSearchParams({ language });
      const { analysis, extraction } = await runNoticeAnalysis({
        file,
        language,
        existingExtraction: cachedExtraction,
        extractUrl: apiUrl(`/extract?${params.toString()}`),
        analyzeUrl: apiUrl("/analyze"),
        signal: controller.signal,
        onStage: (stage) => {
          if (requestId === pipelineRequestRef.current) {
            pipelineStageRef.current = stage;
            setPipelineStage(stage);
            if (stage === "analyzing") setAnalysisRetryAttempt(null);
          }
        },
        onExtracted: (result) => {
          if (requestId === pipelineRequestRef.current) {
            dispatchOriginalText({ type: "extracted", result });
          }
        },
        onRetry: ({ nextAttempt }) => {
          if (requestId === pipelineRequestRef.current) {
            pipelineStageRef.current = "retrying";
            setPipelineStage("retrying");
            setAnalysisRetryAttempt(nextAttempt);
          }
        },
      });
      if (
        !analysis ||
        typeof analysis.summary !== "string" ||
        !Array.isArray(analysis.key_points) ||
        !Array.isArray(analysis.important_dates) ||
        !Array.isArray(analysis.action_items)
      ) {
        throw new Error("The AI returned an incomplete analysis. Please try again.");
      }
      if (requestId === pipelineRequestRef.current) {
        setPipelineStage("preparing");
        setAnalysisResult(analysis);
        onAnalysisComplete?.({
          title: extraction?.filename || file.name,
          filename: extraction?.filename || file.name,
          language,
          category: analysis.document_type || "Notice",
          summary: analysis.summary,
          importantDates: analysis.important_dates,
          actionItems: analysis.action_items,
          pageCount: extraction?.pageCount ?? null,
          status: "analyzed",
          extraction,
          analysis,
        });
      }
    } catch (requestError) {
      if (
        requestId === pipelineRequestRef.current &&
        !controller.signal.aborted
      ) {
        const message =
          requestError instanceof Error
            ? requestError.message
            : "Could not analyze this notice. Please try again.";
        if (requestError instanceof NoticeExtractionError) {
          setExtractionError(message);
        } else {
          setAnalysisError(message);
        }
      }
    } finally {
      if (requestId === pipelineRequestRef.current) {
        isPipelineRunningRef.current = false;
        pipelineControllerRef.current = null;
        pipelineStageRef.current = null;
        setAnalysisRetryAttempt(null);
        setPipelineStage(null);
        setIsPipelineRunning(false);
      }
    }
  }

  function triggerFilePicker() {
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.click();
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      triggerFilePicker();
    }
  }

  return (
    <section id="workspace" aria-labelledby="workspace-heading" className="mx-auto max-w-5xl">
      <Card className="p-5 sm:p-7">
        <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-mint/15">
          <div>
            <h2 id="workspace-heading" className="sr-only">
              Document upload workspace
            </h2>
            <p className="text-sm text-ink-muted dark:text-mint/65">
              PDF circulars and notice photos · English, Hindi, or Marathi analysis
            </p>
          </div>

          <div className="flex flex-col gap-1.5 sm:items-end">
            <div className="flex items-center gap-1.5 text-ink-muted dark:text-mint/65">
              <Globe className="size-3.5" aria-hidden="true" />
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Analysis language
              </span>
            </div>
            <div
              role="group"
              aria-label="Analysis language"
              className="inline-flex max-w-full flex-wrap rounded-md border border-border bg-canvas p-1 dark:border-mint/20 dark:bg-forest-deep"
            >
              {languages.map((lang) => {
                const isSelected = language === lang.id;
                return (
                  <button
                    key={lang.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleLanguageChange(lang.id)}
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      isSelected
                        ? "bg-forest text-canvas dark:bg-mint dark:text-forest"
                        : "text-ink-muted hover:text-ink dark:text-mint/65 dark:hover:text-canvas"
                    }`}
                  >
                    <span>{lang.label}</span>
                    <span className="text-[10px] opacity-75">({lang.nativeLabel})</span>
                    {isSelected && <Check className="size-3 stroke-[2.5]" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {!file ? (
          <div
            ref={dropZoneRef}
            role="button"
            tabIndex={0}
            aria-label="Upload notice file. Press Enter or Space to choose a file, or drag and drop here."
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={triggerFilePicker}
            onKeyDown={handleKeyDown}
            className={`mt-6 flex cursor-pointer flex-col items-center justify-center rounded-[1.35rem] border border-dashed px-6 py-16 text-center transition-[border-color,background-color,box-shadow] duration-150 ${
              isDragging
                ? "border-forest bg-mint-soft/60 shadow-[var(--shadow-soft)] dark:border-mint dark:bg-mint/10"
                : "border-border-strong/80 bg-stone/40 hover:border-forest/35 hover:bg-stone/70 dark:border-mint/18 dark:bg-forest-deep/40 dark:hover:border-mint/35"
            }`}
          >
            <div className="flex size-14 items-center justify-center rounded-2xl border border-border/80 bg-surface text-forest shadow-[var(--shadow-soft)] dark:border-mint/12 dark:bg-forest dark:text-mint">
              <Upload className="size-5" aria-hidden="true" strokeWidth={1.75} />
            </div>
            <p className="mt-5 font-editorial text-2xl text-ink dark:text-canvas">
              Drop your college notice here
            </p>
            <p className="mt-2 text-sm text-ink-muted dark:text-mint/60">
              or{" "}
              <span className="font-medium text-forest underline decoration-mint/70 underline-offset-4 dark:text-mint">
                browse files
              </span>
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
              {["PDF", "PNG", "JPG", "JPEG"].map((format) => (
                <Badge key={format} tone="neutral">
                  {format}
                </Badge>
              ))}
              <span className="text-xs text-ink-muted dark:text-mint/60">· max 10 MB</span>
            </div>
            <span
              aria-hidden="true"
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-forest px-5 py-2.5 text-sm font-semibold text-canvas dark:bg-mint dark:text-forest"
            >
              <Upload className="size-4" />
              Select notice file
            </span>
            <input
              ref={inputRef}
              id="notice-file-input"
              type="file"
              aria-label="Choose a PDF, PNG, JPG, or JPEG notice"
              tabIndex={-1}
              accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
              className="sr-only"
              onChange={onInputChange}
            />
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="rounded-lg border border-border bg-canvas/70 p-5 dark:border-mint/15 dark:bg-forest-deep/40">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  {previewUrl ? (
                    <div className="relative size-20 shrink-0 overflow-hidden rounded-md border border-border bg-surface sm:size-24 dark:border-mint/20">
                      <img
                        src={previewUrl}
                        alt="Notice thumbnail preview"
                        className="size-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-forest/90 py-0.5 text-center text-[10px] font-bold text-canvas">
                        IMAGE
                      </div>
                    </div>
                  ) : (
                    <div className="flex size-20 shrink-0 flex-col items-center justify-center rounded-md border border-border bg-surface text-forest sm:size-24 dark:border-mint/20 dark:bg-forest dark:text-mint">
                      {isPdfFile(file) ? (
                        <>
                          <FileText className="size-8" aria-hidden="true" />
                          <span className="mt-1 font-mono text-[10px] font-bold">PDF</span>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="size-8" aria-hidden="true" />
                          <span className="mt-1 font-mono text-[10px] font-bold">NOTICE</span>
                        </>
                      )}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="mint">
                        <FileCheck2 className="size-3" aria-hidden="true" />
                        Validated
                      </Badge>
                      <span className="font-mono text-xs text-ink-muted dark:text-mint/65">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                    <h3
                      className="mt-2 break-all font-display text-base font-semibold text-ink dark:text-canvas"
                      title={file.name}
                    >
                      {file.name}
                    </h3>
                    <p className="mt-1 text-sm text-ink-muted dark:text-mint/65">
                      {isPdfFile(file)
                        ? "Ready for text extraction and OCR when needed."
                        : "Image ready for OCR extraction."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-start">
                  <Button variant="secondary" size="sm" onClick={triggerFilePicker}>
                    <RefreshCw className="size-3.5" aria-hidden="true" />
                    Replace
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearFile}
                    aria-label="Remove selected notice file"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>

              <input
                ref={inputRef}
                id="notice-file-replace-input"
                type="file"
                aria-label="Choose a PDF, PNG, JPG, or JPEG notice"
                tabIndex={-1}
                accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                className="sr-only"
                onChange={onInputChange}
              />

              {(isPdfFile(file) || isImageFile(file)) && (
                <div className="mt-5 border-t border-border pt-5 dark:border-mint/15">
                  <div className="flex flex-col gap-4 lg:flex-row">
                    <div className="flex-1">
                      <Button
                        onClick={handleAnalyze}
                        disabled={isPipelineRunning}
                        aria-busy={isPipelineRunning}
                      >
                        {isPipelineRunning ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Sparkles className="size-4" aria-hidden="true" />
                        )}
                        Analyze with AI
                      </Button>

                      {isPipelineRunning && (
                        <p
                          role="status"
                          aria-live="polite"
                          className="mt-3 text-sm text-ink dark:text-canvas"
                        >
                          {pipelineStage === "extracting"
                            ? "Reading your notice..."
                            : pipelineStage === "retrying"
                              ? `AI is busy — retrying automatically... (attempt ${analysisRetryAttempt} of ${ANALYSIS_MAX_ATTEMPTS})`
                              : "Analyzing with AI..."}
                        </p>
                      )}
                    </div>

                    {isPipelineRunning && (
                      <div className="w-full lg:max-w-sm">
                        <ProgressSteps
                          steps={PROCESSING_STEPS}
                          activeIndex={progressIndex >= 0 ? progressIndex : 0}
                        />
                      </div>
                    )}
                  </div>

                  {extractionError && (
                    <div
                      role="alert"
                      className="mt-4 flex items-start gap-2.5 rounded-md border border-danger/30 bg-danger-soft p-3.5 text-sm text-danger dark:border-red-400/40 dark:bg-red-950/30 dark:text-red-200"
                    >
                      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      <div className="flex-1">
                        <span className="font-bold">Extraction Error: </span>
                        <span>{extractionError}</span>
                      </div>
                      <button type="button" onClick={() => setExtractionError(null)}>
                        <span className="sr-only">Dismiss</span>
                        <X className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  )}

                  {extractionResult && (
                    <div className="mt-4 rounded-lg border border-border bg-surface p-4 dark:border-mint/15 dark:bg-forest">
                      <div
                        role="status"
                        aria-label={`Text extracted from ${extractionResult.filename}, ${extractionResult.pageCount} page${extractionResult.pageCount !== 1 ? "s" : ""}.`}
                        className="mb-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-ink-muted dark:text-mint/65"
                      >
                        <Badge tone="mint">
                          <FileCheck2 className="size-3" aria-hidden="true" />
                          Extracted
                        </Badge>
                        <span>
                          {extractionResult.pageCount} page
                          {extractionResult.pageCount !== 1 ? "s" : ""}
                        </span>
                        <span>·</span>
                        <span className="min-w-0 break-all font-mono">
                          {extractionResult.filename}
                        </span>
                        {extractionResult.extractionMethod !== "text" && (
                          <>
                            <span>·</span>
                            <span className="uppercase">
                              {extractionResult.extractionMethod === "mixed"
                                ? `OCR pages ${extractionResult.ocrPages.join(", ")}`
                                : "OCR"}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-ink dark:text-canvas">
                          Original notice text is available for verification.
                        </p>
                        <Button
                          variant="secondary"
                          size="sm"
                          aria-expanded={originalTextState.isExpanded}
                          aria-controls="original-notice-text"
                          onClick={() => dispatchOriginalText({ type: "toggle" })}
                        >
                          {originalTextState.isExpanded
                            ? "Hide original text"
                            : "View original text"}
                        </Button>
                      </div>

                      <div
                        id="original-notice-text"
                        hidden={!originalTextState.isExpanded}
                        className="max-h-[28rem] overflow-auto rounded-md border border-border bg-canvas p-4 dark:border-mint/15 dark:bg-forest-deep"
                      >
                        <pre className="mx-auto max-w-[80ch] whitespace-pre-wrap break-words font-sans text-base leading-[1.6] text-ink [overflow-wrap:anywhere] dark:text-canvas sm:text-[17px]">
                          {extractionResult.text}
                        </pre>
                      </div>

                      {analysisError && (
                        <div
                          role="alert"
                          className="mt-3 flex items-start gap-2.5 rounded-md border border-danger/30 bg-danger-soft p-3.5 text-sm text-danger dark:border-red-400/40 dark:bg-red-950/30 dark:text-red-200"
                        >
                          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                          <div className="flex-1">
                            <span className="font-bold">Analysis Error: </span>
                            <span>{analysisError}</span>
                          </div>
                          <button type="button" onClick={() => setAnalysisError(null)}>
                            <span className="sr-only">Dismiss analysis error</span>
                            <X className="size-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      )}

                      {analysisResult && (
                        <div className="mt-4 space-y-3">
                          {analysisResult.summary && (
                            <section className="rounded-lg border border-border bg-canvas p-5 dark:border-mint/20 dark:bg-forest-deep sm:p-6">
                              <h4 className="font-display text-lg font-semibold text-ink dark:text-canvas">
                                Simple summary
                              </h4>
                              <p className="mt-3 max-w-[70ch] whitespace-pre-wrap break-words text-base leading-relaxed text-ink [overflow-wrap:anywhere] dark:text-canvas sm:text-lg">
                                {analysisResult.summary}
                              </p>
                            </section>
                          )}

                          {analysisResult.key_points?.length > 0 && (
                            <section className="rounded-lg border border-border bg-canvas p-5 dark:border-mint/15 dark:bg-forest-deep sm:p-6">
                              <h4 className="font-display text-lg font-semibold text-ink dark:text-canvas">
                                Key announcements
                              </h4>
                              <ul className="mt-3 list-disc space-y-3 pl-5 text-base leading-relaxed text-ink dark:text-canvas sm:text-lg">
                                {analysisResult.key_points.map((point, index) => (
                                  <li
                                    key={`${index}-${point}`}
                                    className="break-words [overflow-wrap:anywhere]"
                                  >
                                    {point}
                                  </li>
                                ))}
                              </ul>
                            </section>
                          )}

                          {analysisResult.important_dates?.length > 0 && (
                            <section className="rounded-lg border border-border bg-canvas p-5 dark:border-mint/15 dark:bg-forest-deep sm:p-6">
                              <h4 className="font-display text-lg font-semibold text-ink dark:text-canvas">
                                Important dates
                              </h4>
                              <ul className="mt-3 space-y-3 text-base leading-relaxed text-ink dark:text-canvas sm:text-lg">
                                {analysisResult.important_dates.map((item, index) => (
                                  <li
                                    key={`${index}-${item.date}`}
                                    className="break-words [overflow-wrap:anywhere]"
                                  >
                                    <span className="font-semibold">
                                      {item.label}: {item.date}
                                    </span>
                                    {item.type && (
                                      <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-ink-muted dark:text-mint/65">
                                        {dateTypeLabel(item.type)}
                                      </span>
                                    )}
                                    {item.verified === false && (
                                      <span className="ml-2 text-xs font-semibold text-ink-muted">
                                        Date unverified
                                      </span>
                                    )}
                                    {item.context && <span> — {item.context}</span>}
                                  </li>
                                ))}
                              </ul>
                            </section>
                          )}

                          {(deadlineDates.length > 0 || eventDates.length > 0) && (
                            <section
                              aria-labelledby="deadline-tracker-heading"
                              className="rounded-lg border border-border bg-canvas p-5 dark:border-mint/15 dark:bg-forest-deep sm:p-6"
                            >
                              <h4
                                id="deadline-tracker-heading"
                                className="font-display text-lg font-semibold text-ink dark:text-canvas"
                              >
                                Deadline tracker
                              </h4>
                              <p className="mt-2 text-sm leading-relaxed text-ink dark:text-canvas">
                                Action deadlines are separate from dates when events take place.
                              </p>

                              {deadlineStatusStale && (
                                <p
                                  role="status"
                                  className="mt-3 rounded-md border border-border px-3 py-2 text-sm dark:border-mint/20"
                                >
                                  Urgency was calculated for {urgencyCalculatedOn} in Asia/Kolkata.
                                  Re-analyze to refresh it for today.
                                </p>
                              )}

                              {deadlineDates.length > 0 && (
                                <div className="mt-3">
                                  <h5 className="text-sm font-bold uppercase tracking-wide text-ink dark:text-canvas">
                                    Action deadlines
                                  </h5>
                                  <ul className="mt-2 space-y-2">
                                    {deadlineDates.map((item, index) => {
                                      const verifiedDate =
                                        item.verified === true && item.normalized_date;
                                      const urgency = verifiedDate
                                        ? item.urgency ?? "unknown"
                                        : "unknown";
                                      const visibleStatus = deadlineStatusStale
                                        ? "refresh"
                                        : urgency;
                                      const daysRemaining = item.days_remaining;

                                      return (
                                        <li
                                          key={`${index}-${item.label}-${item.date}`}
                                          className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between dark:border-mint/15 dark:bg-forest"
                                        >
                                          <div className="min-w-0">
                                            <p className="break-words text-base font-semibold leading-relaxed [overflow-wrap:anywhere]">
                                              {item.label}
                                            </p>
                                            <p className="mt-1 break-words text-base leading-relaxed [overflow-wrap:anywhere]">
                                              {verifiedDate
                                                ? item.original_date ?? item.date
                                                : "Full date not verified; check the original notice."}
                                            </p>
                                            {!deadlineStatusStale &&
                                              verifiedDate &&
                                              Number.isInteger(daysRemaining) &&
                                              daysRemaining > 0 && (
                                                <p className="mt-1 text-sm">
                                                  {daysRemaining} calendar day
                                                  {daysRemaining === 1 ? "" : "s"} remaining
                                                </p>
                                              )}
                                            {!deadlineStatusStale &&
                                              verifiedDate &&
                                              daysRemaining === 0 &&
                                              urgency === "overdue" &&
                                              item.normalized_datetime && (
                                                <p className="mt-1 text-sm">
                                                  Stated deadline time has passed
                                                </p>
                                              )}
                                            {!deadlineStatusStale &&
                                              verifiedDate &&
                                              Number.isInteger(daysRemaining) &&
                                              daysRemaining < 0 && (
                                                <p className="mt-1 text-sm">
                                                  {Math.abs(daysRemaining)} calendar day
                                                  {Math.abs(daysRemaining) === 1 ? "" : "s"}{" "}
                                                  overdue
                                                </p>
                                              )}
                                          </div>
                                          <span
                                            className={`inline-flex w-fit shrink-0 items-center rounded-md border px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${urgencyStyles[visibleStatus] ?? urgencyStyles.unknown}`}
                                          >
                                            {deadlineStatusStale
                                              ? "Refresh to update"
                                              : urgencyLabels[urgency] ?? urgencyLabels.unknown}
                                          </span>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              )}

                              {eventDates.length > 0 && (
                                <div
                                  className={`${deadlineDates.length > 0 ? "mt-4 border-t border-border pt-3 dark:border-mint/15" : "mt-3"}`}
                                >
                                  <h5 className="text-sm font-bold uppercase tracking-wide">
                                    Event dates · Not deadlines
                                  </h5>
                                  <ul className="mt-3 space-y-3 text-base leading-relaxed sm:text-lg">
                                    {eventDates.map((item, index) => (
                                      <li
                                        key={`${index}-${item.label}-${item.date}`}
                                        className="flex flex-wrap justify-between gap-x-3 gap-y-1 break-words [overflow-wrap:anywhere]"
                                      >
                                        <span className="font-semibold">{item.label}</span>
                                        <span>
                                          {item.verified === true
                                            ? item.original_date ?? item.date
                                            : "Date unverified"}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </section>
                          )}

                          {analysisResult.action_items?.length > 0 && (
                            <section className="rounded-lg border border-border bg-canvas p-5 dark:border-mint/20 dark:bg-forest-deep sm:p-6">
                              <h4 className="font-display text-lg font-semibold text-ink dark:text-canvas">
                                Action items
                              </h4>
                              <ul className="mt-3 list-disc space-y-3 pl-5 text-base leading-relaxed text-ink dark:text-canvas sm:text-lg">
                                {analysisResult.action_items.map((item, index) => (
                                  <li
                                    key={`${index}-${item}`}
                                    className="break-words [overflow-wrap:anywhere]"
                                  >
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </section>
                          )}

                          <p className="text-[11px] text-ink-muted dark:text-mint/60">
                            AI explanations can be inaccurate. Check dates, eligibility, and
                            requirements against the original notice.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2.5 rounded-md border border-danger/30 bg-danger-soft p-3.5 text-sm text-danger dark:border-red-400/40 dark:bg-red-950/30 dark:text-red-200"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div className="flex-1">
              <span className="font-bold">Notice Error: </span>
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError("")}>
              <span className="sr-only">Dismiss error</span>
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="mt-5 flex flex-col items-start justify-between gap-2 border-t border-border pt-4 text-xs text-ink-muted sm:flex-row sm:items-center dark:border-mint/15 dark:text-mint/60">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-mint" />
            Extracted notice text can be analyzed in English, Hindi, or Marathi.
          </span>
          <span className="font-mono text-[11px]">
            Max 10 MB · PDF, PNG, JPG, JPEG
          </span>
        </div>
      </Card>
    </section>
  );
}

export default NoticeUpload;
