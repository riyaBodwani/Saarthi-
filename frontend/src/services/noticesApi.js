import { apiRequest } from "./apiClient";

export function fetchNotices(token, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== "all") {
      query.set(key, value);
    }
  });
  const suffix = query.toString() ? `?${query}` : "";
  return apiRequest(`/notices${suffix}`, { token });
}

export function fetchNotice(token, noticeId) {
  return apiRequest(`/notices/${noticeId}`, { token });
}

export function saveNotice(token, payload) {
  return apiRequest("/notices", { method: "POST", token, body: payload });
}

export function updateNotice(token, noticeId, patch) {
  return apiRequest(`/notices/${noticeId}`, {
    method: "PATCH",
    token,
    body: patch,
  });
}

export function deleteNotice(token, noticeId) {
  return apiRequest(`/notices/${noticeId}`, { method: "DELETE", token });
}

export function fetchDashboardStats(token) {
  return apiRequest("/dashboard/stats", { token });
}

export function mapServerNoticeToLocal(notice) {
  if (!notice) return null;
  const analysis = notice.analysis || notice.structured_analysis || null;
  return {
    id: notice.id,
    title: notice.title,
    filename: notice.original_filename || notice.filename || "",
    language: notice.language || "english",
    category: notice.document_type || "Notice",
    uploadedAt: notice.created_at || notice.uploadedAt,
    status: "analyzed",
    summary: analysis?.summary || notice.summary || "",
    importantDates: analysis?.important_dates || notice.dates || [],
    actionItems: analysis?.action_items || notice.action_items || [],
    pageCount: notice.page_count ?? null,
    extraction: {
      text: notice.extracted_text || "",
      filename: notice.original_filename || "",
      pageCount: notice.page_count ?? 1,
      pages: notice.pages || [],
    },
    analysis,
    favorite: Boolean(notice.favorite),
    persisted: true,
  };
}
