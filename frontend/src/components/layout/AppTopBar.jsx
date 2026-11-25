import { useEffect, useMemo, useState } from "react";
import { Bell, Menu, Search } from "lucide-react";
import { PAGE_META } from "../../navigation";
import { useApp } from "../../hooks/useApp";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../services/calendarApi";
import { Input } from "../ui/Input";
import { IconButton } from "../ui/IconButton";

export function AppTopBar() {
  const {
    view,
    setView,
    setMobileNavOpen,
    noticeHistory,
    authToken,
    currentUser,
    openNoticeAnalysis,
  } = useApp();
  const meta = PAGE_META[view] || PAGE_META.dashboard;
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!authToken) {
        setNotifications([]);
        return;
      }
      try {
        const data = await fetchNotifications(authToken);
        if (!cancelled) {
          setNotifications(Array.isArray(data) ? data : data?.items || []);
        }
      } catch {
        if (!cancelled) setNotifications([]);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [authToken, view]);

  const unread = notifications.filter((item) => !item.read).length;
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return noticeHistory
      .filter((notice) => {
        const haystack = [notice.title, notice.summary, notice.filename]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 6);
  }, [noticeHistory, query]);

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-canvas/75 backdrop-blur-xl dark:border-mint/10 dark:bg-forest-deep/80">
      <div className="flex h-14 items-center justify-between gap-3 px-4 sm:h-16 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <IconButton
            label="Open navigation menu"
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="size-4" aria-hidden="true" strokeWidth={1.75} />
          </IconButton>

          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px]">
              <span className="font-medium tracking-wide text-ink-faint dark:text-mint/45">
                Saarthi
              </span>
              <span className="text-border-strong dark:text-mint/20">/</span>
              <span className="truncate font-medium text-ink-muted dark:text-mint/65">
                {meta.breadcrumb}
              </span>
            </div>
            <h1 className="mt-0.5 truncate font-editorial text-xl leading-tight text-ink dark:text-canvas sm:text-[1.35rem]">
              {meta.title}
            </h1>
          </div>
        </div>

        <div className="relative flex items-center gap-1.5 sm:gap-2">
          <div className="hidden md:block">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-faint"
                strokeWidth={1.75}
              />
              <Input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Search notices…"
                className="h-9 w-52 rounded-xl border-border/80 bg-surface/90 pl-9 lg:w-64"
                aria-label="Search notices"
              />
            </div>
          </div>

          <IconButton
            label="Search notices"
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            onClick={() => setSearchOpen((value) => !value)}
          >
            <Search className="size-4" strokeWidth={1.75} />
          </IconButton>

          <div className="relative">
            <IconButton
              label="Notifications"
              variant="ghost"
              size="icon-sm"
              onClick={() => setOpen((value) => !value)}
            >
              <Bell className="size-4" aria-hidden="true" strokeWidth={1.75} />
              {(unread > 0 || (!authToken && noticeHistory.length > 0)) && (
                <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-gold" />
              )}
            </IconButton>

            {open && (
              <div className="absolute right-0 top-11 z-40 w-80 rounded-2xl border border-border/80 bg-surface p-3.5 shadow-[var(--shadow-lift)] scale-in dark:border-mint/12 dark:bg-forest">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium">Notifications</p>
                  {authToken && unread > 0 && (
                    <button
                      type="button"
                      className="text-xs font-medium text-forest dark:text-mint"
                      onClick={async () => {
                        await markAllNotificationsRead(authToken);
                        setNotifications((prev) =>
                          prev.map((item) => ({ ...item, read: true }))
                        );
                      }}
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                {!authToken && (
                  <p className="text-xs leading-relaxed text-ink-muted">
                    Sign in to receive reminder and deadline notifications.
                  </p>
                )}
                {authToken && notifications.length === 0 && (
                  <p className="text-xs text-ink-muted">No notifications yet.</p>
                )}
                <ul className="max-h-64 space-y-1.5 overflow-auto">
                  {notifications.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="w-full rounded-xl border border-border/70 px-3 py-2.5 text-left text-xs transition-colors hover:bg-stone dark:border-mint/10 dark:hover:bg-forest-deep"
                        onClick={async () => {
                          if (!item.read && authToken) {
                            await markNotificationRead(authToken, item.id);
                            setNotifications((prev) =>
                              prev.map((entry) =>
                                entry.id === item.id ? { ...entry, read: true } : entry
                              )
                            );
                          }
                        }}
                      >
                        <p className="font-medium">{item.title}</p>
                        <p className="mt-0.5 text-ink-muted">{item.body}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setView(currentUser ? "settings" : "auth")}
            className="hidden items-center gap-2 rounded-xl px-1.5 py-1 transition-colors duration-150 hover:bg-stone sm:flex dark:hover:bg-forest-deep"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-forest text-[11px] font-semibold text-mint dark:bg-mint dark:text-forest">
              {(currentUser?.name || "S").slice(0, 1).toUpperCase()}
            </span>
            <span className="pr-1.5 text-xs font-medium text-ink dark:text-canvas">
              {currentUser?.name?.split(" ")[0] || "Account"}
            </span>
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-border/60 px-4 py-3 dark:border-mint/10 sm:px-6 lg:px-8">
          <div className="md:hidden">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search notices…"
              autoFocus
            />
          </div>
          <div className="mt-2 space-y-1 md:mt-0">
            {query.trim() && searchResults.length === 0 && (
              <p className="text-xs text-ink-muted">No matching notices.</p>
            )}
            {searchResults.map((notice) => (
              <button
                key={notice.id}
                type="button"
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-stone dark:hover:bg-forest-deep"
                onClick={() => {
                  openNoticeAnalysis(notice.id);
                  setSearchOpen(false);
                  setQuery("");
                }}
              >
                <span className="truncate font-medium">{notice.title}</span>
                <span className="text-xs text-ink-faint">{notice.category}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

export default AppTopBar;
