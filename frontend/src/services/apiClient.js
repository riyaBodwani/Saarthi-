import { API_BASE_URL } from "../config/api";

export class ApiError extends Error {
  constructor(message, { status = null, detail = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function parseError(response) {
  const data = await response.json().catch(() => null);
  const detail =
    typeof data?.detail === "string"
      ? data.detail
      : Array.isArray(data?.detail)
        ? data.detail.map((item) => item.msg || JSON.stringify(item)).join("; ")
        : `Request failed (${response.status})`;
  return new ApiError(detail, { status: response.status, detail: data?.detail });
}

export async function apiRequest(
  path,
  { method = "GET", token = null, body = undefined, headers = {}, signal } = {}
) {
  const finalHeaders = { ...headers };
  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders["Content-Type"] = "application/json";
  }
  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`, {
      method,
      headers: finalHeaders,
      body:
        body === undefined
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
      signal,
    });
  } catch {
    throw new ApiError(
      "Could not reach the Saarthi backend. Make sure the API server is running.",
      { status: null }
    );
  }

  if (!response.ok) {
    throw await parseError(response);
  }
  if (response.status === 204) return null;
  return response.json();
}
