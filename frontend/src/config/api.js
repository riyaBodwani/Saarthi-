const DEFAULT_API_BASE_URL = "http://127.0.0.1:8001";

function normalizeBaseUrl(value) {
  if (typeof value !== "string") return DEFAULT_API_BASE_URL;
  const trimmed = value.trim().replace(/\/+$/, "");
  return trimmed || DEFAULT_API_BASE_URL;
}

export const API_BASE_URL = normalizeBaseUrl(
  import.meta.env?.VITE_API_BASE_URL
);

export function apiUrl(path = "") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}
