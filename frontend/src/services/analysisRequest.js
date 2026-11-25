export const ANALYSIS_MAX_ATTEMPTS = 3;
export const ANALYSIS_TOTAL_BUDGET_MS = 65_000;

const ATTEMPT_TIMEOUT_MS = 35_000;
const RETRY_BASE_DELAY_MS = 500;
const RETRY_MAX_DELAY_MS = 5_000;
const RETRYABLE_HTTP_STATUSES = new Set([429, 502, 503, 504]);

export class AnalysisRequestError extends Error {
  constructor(message, { status = null, kind = "response" } = {}) {
    super(message);
    this.name = "AnalysisRequestError";
    this.status = status;
    this.kind = kind;
  }
}

class AnalysisAttemptTimeoutError extends Error {
  constructor() {
    super("Analysis attempt timed out.");
    this.name = "AnalysisAttemptTimeoutError";
  }
}

function createAbortError() {
  const error = new Error("The analysis request was cancelled.");
  error.name = "AbortError";
  return error;
}

function getHeader(response, name) {
  try {
    return response.headers?.get?.(name) ?? null;
  } catch {
    return null;
  }
}

function retryAfterMilliseconds(value, now) {
  if (typeof value !== "string" || !value.trim()) return null;
  const trimmed = value.trim();
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    return Number(trimmed) * 1000;
  }
  const retryAt = Date.parse(trimmed);
  return Number.isNaN(retryAt) ? null : Math.max(0, retryAt - now);
}

function retryDelayMilliseconds(failedAttempt, retryAfter, random) {
  const base = Math.min(
    RETRY_MAX_DELAY_MS,
    RETRY_BASE_DELAY_MS * 2 ** (failedAttempt - 1)
  );
  const jitter = base * (0.75 + Math.min(1, Math.max(0, random())) * 0.5);
  return Math.max(jitter, retryAfter ?? 0);
}

async function fetchWithAttemptTimeout(
  fetchImpl,
  url,
  init,
  parentSignal,
  timeoutMs
) {
  if (parentSignal?.aborted) throw createAbortError();

  const controller = new AbortController();
  let timedOut = false;
  const abortFromParent = () => controller.abort();
  parentSignal?.addEventListener("abort", abortFromParent, { once: true });
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, Math.max(1, timeoutMs));

  try {
    const response = await fetchImpl(url, { ...init, signal: controller.signal });
    const payload =
      typeof response.text === "function"
        ? await response.text()
        : await response.json();
    if (parentSignal?.aborted) throw createAbortError();
    return {
      ok: response.ok,
      status: response.status,
      headers: response.headers,
      async json() {
        return typeof payload === "string" ? JSON.parse(payload) : payload;
      },
    };
  } catch (error) {
    if (parentSignal?.aborted) throw error;
    if (timedOut) throw new AnalysisAttemptTimeoutError();
    throw error;
  } finally {
    clearTimeout(timeoutId);
    parentSignal?.removeEventListener("abort", abortFromParent);
  }
}

function waitForRetry(delayMs, signal) {
  if (signal?.aborted) return Promise.reject(createAbortError());
  return new Promise((resolve, reject) => {
    const timerId = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, delayMs);
    const abort = () => {
      clearTimeout(timerId);
      signal?.removeEventListener("abort", abort);
      reject(createAbortError());
    };
    signal?.addEventListener("abort", abort, { once: true });
  });
}

async function responseError(response) {
  const data = await response.json().catch(() => null);
  const detail =
    typeof data?.detail === "string"
      ? data.detail
      : `Could not analyze this notice (server error ${response.status}).`;
  return new AnalysisRequestError(detail, {
    status: response.status,
    kind: "response",
  });
}

function isRetryableResponse(response, retryAfter) {
  if (
    getHeader(response, "X-Notiva-Retryable")?.toLowerCase() !== "true" ||
    !RETRYABLE_HTTP_STATUSES.has(response.status)
  ) {
    return false;
  }
  return response.status !== 429 || retryAfter !== null;
}

function finalTransportError(error) {
  if (error instanceof AnalysisAttemptTimeoutError) {
    return new AnalysisRequestError(
      `Analysis timed out after ${ANALYSIS_MAX_ATTEMPTS} attempts. Please try again.`,
      { kind: "timeout" }
    );
  }
  return new AnalysisRequestError(
    `Could not reach the Saarthi analysis service after ${ANALYSIS_MAX_ATTEMPTS} attempts. Check your connection and try again.`,
    { kind: "network" }
  );
}

export async function requestNoticeAnalysis({
  url,
  extractedText,
  language,
  pages = null,
  signal,
  fetchImpl = fetch,
  onRetry = () => {},
  now = () => Date.now(),
  sleep = waitForRetry,
  random = Math.random,
  totalBudgetMs = ANALYSIS_TOTAL_BUDGET_MS,
  attemptTimeoutMs = ATTEMPT_TIMEOUT_MS,
}) {
  const deadline = now() + totalBudgetMs;
  let lastTransportError = null;

  for (let attempt = 1; attempt <= ANALYSIS_MAX_ATTEMPTS; attempt += 1) {
    if (signal?.aborted) throw createAbortError();
    const remaining = deadline - now();
    if (remaining <= 0) {
      if (lastTransportError) throw finalTransportError(lastTransportError);
      throw new AnalysisRequestError(
        "Analysis exceeded its time limit. Please try again.",
        { kind: "timeout" }
      );
    }

    let response;
    try {
      response = await fetchWithAttemptTimeout(
        fetchImpl,
        url,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            extracted_text: extractedText,
            language,
            ...(Array.isArray(pages) && pages.length > 0 ? { pages } : {}),
          }),
        },
        signal,
        Math.min(attemptTimeoutMs, remaining)
      );
    } catch (error) {
      if (signal?.aborted) throw error;
      if (error instanceof TypeError) {
        throw new AnalysisRequestError(
          "Could not reach the Saarthi backend. Check your connection and try again.",
          { kind: "network" }
        );
      }
      if (!(error instanceof AnalysisAttemptTimeoutError)) {
        throw error;
      }

      lastTransportError = error;
      if (attempt === ANALYSIS_MAX_ATTEMPTS) {
        throw finalTransportError(error);
      }
      const delay = retryDelayMilliseconds(attempt, null, random);
      if (delay >= deadline - now()) throw finalTransportError(error);
      onRetry({ nextAttempt: attempt + 1, totalAttempts: ANALYSIS_MAX_ATTEMPTS });
      await sleep(delay, signal);
      continue;
    }

    if (!response.ok) {
      const error = await responseError(response);
      const retryAfter = retryAfterMilliseconds(getHeader(response, "Retry-After"), now());
      if (
        !isRetryableResponse(response, retryAfter) ||
        attempt === ANALYSIS_MAX_ATTEMPTS
      ) {
        throw error;
      }
      const delay = retryDelayMilliseconds(attempt, retryAfter, random);
      if (delay >= deadline - now()) throw error;
      onRetry({ nextAttempt: attempt + 1, totalAttempts: ANALYSIS_MAX_ATTEMPTS });
      await sleep(delay, signal);
      continue;
    }

    try {
      return await response.json();
    } catch {
      throw new AnalysisRequestError(
        "The AI returned an unreadable response. Please try again.",
        { status: response.status, kind: "response" }
      );
    }
  }

  if (lastTransportError) throw finalTransportError(lastTransportError);
  throw new AnalysisRequestError("Could not analyze this notice. Please try again.");
}
