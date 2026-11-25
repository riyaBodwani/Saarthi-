const STORAGE_KEY = "saarthi_notice_history_v1";
const MAX_ENTRIES = 40;

function safeParse(raw) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadNoticeHistory() {
  if (typeof window === "undefined") return [];
  try {
    return safeParse(sessionStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

export function getNoticeById(id, history = loadNoticeHistory()) {
  return history.find((item) => item.id === id) || null;
}

export function saveNoticeHistoryEntry(entry) {
  if (typeof window === "undefined" || !entry) return [];
  const nextEntry = {
    id: entry.id || crypto.randomUUID?.() || `notice-${Date.now()}`,
    title: entry.title || "Untitled notice",
    filename: entry.filename || "",
    language: entry.language || "english",
    category: entry.category || entry.analysis?.document_type || "Notice",
    uploadedAt: entry.uploadedAt || new Date().toISOString(),
    status: entry.status || "analyzed",
    summary: entry.summary || entry.analysis?.summary || "",
    importantDates: Array.isArray(entry.importantDates)
      ? entry.importantDates
      : entry.analysis?.important_dates || [],
    actionItems: Array.isArray(entry.actionItems)
      ? entry.actionItems
      : entry.analysis?.action_items || [],
    pageCount: entry.pageCount ?? null,
    extraction: entry.extraction || null,
    analysis: entry.analysis || null,
    favorite: Boolean(entry.favorite),
  };

  try {
    const existing = loadNoticeHistory().filter((item) => item.id !== nextEntry.id);
    const updated = [nextEntry, ...existing].slice(0, MAX_ENTRIES);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [nextEntry];
  }
}

export function updateNoticeHistoryEntry(id, patch) {
  const existing = loadNoticeHistory();
  const updated = existing.map((item) =>
    item.id === id ? { ...item, ...patch, id: item.id } : item
  );
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage failures
  }
  return updated;
}

export function deleteNoticeHistoryEntry(id) {
  const updated = loadNoticeHistory().filter((item) => item.id !== id);
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
  return updated;
}

export function getDashboardStats(history = loadNoticeHistory(), now = new Date()) {
  const month = now.getMonth();
  const year = now.getFullYear();
  const upcomingDeadlines = [];
  let pendingActions = 0;

  for (const notice of history) {
    pendingActions += Array.isArray(notice.actionItems) ? notice.actionItems.length : 0;
    for (const dateItem of notice.importantDates || []) {
      if (dateItem?.type !== "deadline") continue;
      if (!dateItem.normalized_date) continue;
      const urgency = dateItem.urgency;
      if (urgency === "overdue") continue;
      upcomingDeadlines.push({
        noticeId: notice.id,
        noticeTitle: notice.title,
        label: dateItem.label,
        date: dateItem.normalized_date,
        originalDate: dateItem.original_date || dateItem.date,
        type: dateItem.type,
        urgency: urgency || "unknown",
        daysRemaining: dateItem.days_remaining ?? null,
      });
    }
  }

  upcomingDeadlines.sort((a, b) => {
    if (a.date === b.date) return 0;
    return a.date < b.date ? -1 : 1;
  });

  const noticesThisMonth = history.filter((notice) => {
    const uploaded = new Date(notice.uploadedAt);
    return (
      !Number.isNaN(uploaded.getTime()) &&
      uploaded.getMonth() === month &&
      uploaded.getFullYear() === year
    );
  }).length;

  const categoryCounts = history.reduce((acc, notice) => {
    const key = notice.category || "Notice";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return {
    totalNotices: history.length,
    upcomingDeadlineCount: upcomingDeadlines.length,
    pendingActions,
    noticesThisMonth,
    upcomingDeadlines: upcomingDeadlines.slice(0, 6),
    recentNotices: history.slice(0, 6),
    categoryCounts,
  };
}
