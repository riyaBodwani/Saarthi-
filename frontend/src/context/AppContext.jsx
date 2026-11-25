import { useMemo, useState } from "react";
import { useTheme } from "../hooks/useTheme";
import { isValidView } from "../navigation";
import {
  deleteNoticeHistoryEntry,
  getDashboardStats,
  getNoticeById,
  loadNoticeHistory,
  saveNoticeHistoryEntry,
  updateNoticeHistoryEntry,
} from "../services/noticeHistory";
import { mapServerNoticeToLocal, saveNotice } from "../services/noticesApi";
import { AppContext } from "./app-context";

export function AppProvider({ children }) {
  const { theme, toggleTheme, setTheme, isDark } = useTheme();
  const [view, setViewState] = useState("dashboard");
  const [language, setLanguage] = useState("english");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [noticeHistory, setNoticeHistory] = useState(() => loadNoticeHistory());
  const [activeNoticeId, setActiveNoticeId] = useState(null);
  const [assistantNoticeId, setAssistantNoticeId] = useState(null);
  const [authToken, setAuthToken] = useState(() => {
    try {
      return localStorage.getItem("saarthi_access_token") || null;
    } catch {
      return null;
    }
  });
  const [currentUser, setCurrentUser] = useState(null);

  function setView(nextView) {
    if (!isValidView(nextView)) return;
    setViewState(nextView);
    setMobileNavOpen(false);
  }

  async function recordNoticeAnalysis(entry) {
    let nextEntry = { ...entry };
    if (authToken) {
      try {
        const savedRemote = await saveNotice(authToken, {
          title: entry.title,
          original_filename: entry.filename,
          document_type: entry.category || "Notice",
          language: entry.language,
          extracted_text: entry.extraction?.text || "",
          page_count: entry.pageCount,
          pages: entry.extraction?.pages || [],
          analysis: entry.analysis,
          favorite: false,
        });
        nextEntry = mapServerNoticeToLocal(savedRemote) || nextEntry;
      } catch {
        // Fall back to session storage if persistence API is unavailable.
      }
    }
    const updated = saveNoticeHistoryEntry(nextEntry);
    setNoticeHistory(updated);
    const saved = updated[0];
    if (saved?.id) {
      setActiveNoticeId(saved.id);
      setView("analysis");
    }
    return updated;
  }

  function openNoticeAnalysis(noticeId) {
    const notice = getNoticeById(noticeId, noticeHistory);
    if (!notice) return;
    setActiveNoticeId(noticeId);
    setView("analysis");
  }

  function openAssistantForNotice(noticeId) {
    setAssistantNoticeId(noticeId || null);
    setView("assistant");
  }

  function removeNotice(noticeId) {
    const updated = deleteNoticeHistoryEntry(noticeId);
    setNoticeHistory(updated);
    if (activeNoticeId === noticeId) setActiveNoticeId(null);
  }

  function renameNotice(noticeId, title) {
    const updated = updateNoticeHistoryEntry(noticeId, { title });
    setNoticeHistory(updated);
  }

  function toggleFavorite(noticeId) {
    const notice = getNoticeById(noticeId, noticeHistory);
    if (!notice) return;
    const updated = updateNoticeHistoryEntry(noticeId, {
      favorite: !notice.favorite,
    });
    setNoticeHistory(updated);
  }

  function setSessionAuth(token, user) {
    setAuthToken(token);
    setCurrentUser(user);
    try {
      if (token) localStorage.setItem("saarthi_access_token", token);
      else localStorage.removeItem("saarthi_access_token");
    } catch {
      // ignore
    }
  }

  function clearSessionAuth() {
    setSessionAuth(null, null);
  }

  const activeNotice = useMemo(
    () => getNoticeById(activeNoticeId, noticeHistory),
    [activeNoticeId, noticeHistory]
  );

  const dashboardStats = useMemo(
    () => getDashboardStats(noticeHistory),
    [noticeHistory]
  );

  const value = {
    view,
    setView,
    language,
    setLanguage,
    theme,
    toggleTheme,
    setTheme,
    isDark,
    sidebarCollapsed,
    setSidebarCollapsed,
    mobileNavOpen,
    setMobileNavOpen,
    noticeHistory,
    setNoticeHistory,
    recordNoticeAnalysis,
    activeNoticeId,
    activeNotice,
    openNoticeAnalysis,
    openAssistantForNotice,
    assistantNoticeId,
    setAssistantNoticeId,
    removeNotice,
    renameNotice,
    toggleFavorite,
    dashboardStats,
    authToken,
    currentUser,
    setSessionAuth,
    clearSessionAuth,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
