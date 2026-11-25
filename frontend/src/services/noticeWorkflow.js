import { requestNoticeAnalysis } from "./analysisRequest.js";

export class NoticeExtractionError extends Error {
  constructor(message, kind = "response") {
    super(message);
    this.name = "NoticeExtractionError";
    this.kind = kind;
  }
}

export function acquireNoticeWorkflow(lockRef) {
  if (lockRef.current) return false;
  lockRef.current = true;
  return true;
}

function createAbortError() {
  const error = new Error("The notice analysis was cancelled.");
  error.name = "AbortError";
  return error;
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw createAbortError();
}

export function hasUsableExtraction(extraction) {
  return (
    typeof extraction?.text === "string" &&
    extraction.text.trim().length > 0 &&
    Number.isInteger(extraction.pageCount) &&
    extraction.pageCount > 0
  );
}

export async function extractNoticeText({
  url,
  file,
  signal,
  fetchImpl = fetch,
  formDataFactory = () => new FormData(),
}) {
  const formData = formDataFactory();
  formData.append("file", file);

  let response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      body: formData,
      signal,
    });
  } catch (error) {
    if (signal?.aborted || error?.name === "AbortError") throw error;
    throw new NoticeExtractionError(
      "Could not reach the Saarthi backend. Make sure the backend server is running on port 8001.",
      "network"
    );
  }

  const data = await response.json().catch(() => null);
  throwIfAborted(signal);

  if (!response.ok) {
    throw new NoticeExtractionError(
      typeof data?.detail === "string"
        ? data.detail
        : `Could not extract text (server error ${response.status}).`
    );
  }
  if (
    typeof data?.extracted_text !== "string" ||
    !data.extracted_text.trim() ||
    !Number.isInteger(data.page_count) ||
    data.page_count < 1
  ) {
    throw new NoticeExtractionError(
      "The backend returned no readable text. Try a clearer image or scan and try again."
    );
  }

  return {
    text: data.extracted_text,
    pageCount: data.page_count,
    filename: typeof data.filename === "string" ? data.filename : file.name,
    extractionMethod: data.extraction_method ?? "text",
    ocrPages: Array.isArray(data.ocr_pages) ? data.ocr_pages : [],
    pages: Array.isArray(data.pages) ? data.pages : [],
  };
}

export async function runNoticeAnalysis({
  file,
  language,
  existingExtraction,
  extractUrl,
  analyzeUrl,
  signal,
  extract = extractNoticeText,
  analyze = requestNoticeAnalysis,
  onStage = () => {},
  onExtracted = () => {},
  onRetry = () => {},
}) {
  let extraction = hasUsableExtraction(existingExtraction)
    ? existingExtraction
    : null;

  if (!extraction) {
    onStage("extracting");
    extraction = await extract({
      url: extractUrl,
      file,
      language,
      signal,
    });
    throwIfAborted(signal);
    if (!hasUsableExtraction(extraction)) {
      throw new NoticeExtractionError(
        "The backend returned no readable text. Try a clearer image or scan and try again."
      );
    }
    onExtracted(extraction);
  }

  throwIfAborted(signal);
  onStage("analyzing");
  const analysis = await analyze({
    url: analyzeUrl,
    extractedText: extraction.text,
    language,
    pages: extraction.pages,
    signal,
    onRetry,
  });
  throwIfAborted(signal);

  return { extraction, analysis };
}
