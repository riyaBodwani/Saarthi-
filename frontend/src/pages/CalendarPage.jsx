import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Field, Input } from "../components/ui/Input";
import { PageHeader } from "../components/ui/PageHeader";
import { useApp } from "../hooks/useApp";
import {
  createReminder,
  fetchActionItems,
  fetchCalendarEvents,
  fetchReminders,
  updateActionItem,
} from "../services/calendarApi";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const KIND_DOT = {
  deadline: "bg-gold",
  examination: "bg-danger",
  assignment: "bg-forest",
  registration: "bg-mint",
  payment: "bg-gold",
  event: "bg-forest",
  reminder: "bg-mint",
  action: "bg-ink-muted",
};

const urgencyTone = {
  overdue: "danger",
  due_today: "gold",
  urgent: "warning",
  upcoming: "mint",
  later: "neutral",
  unknown: "neutral",
  deadline: "gold",
  event: "mint",
  reminder: "forest",
  action: "warning",
};

function pad2(value) {
  return String(value).padStart(2, "0");
}

function toDateKey(value) {
  if (!value) return null;
  if (typeof value === "string") {
    const isoDay = value.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoDay)) return isoDay;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseDateKey(key) {
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDisplayDate(value) {
  const date = typeof value === "string" ? parseDateKey(value) || new Date(value) : value;
  if (!date || Number.isNaN(date.getTime())) return value || "—";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatMonthLabel(date) {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function shiftMonth(date, delta) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function startOfWeek(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
}

function buildWeekDays(anchor) {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date,
      dateKey: toDateKey(date),
      label: WEEKDAYS[index],
      day: date.getDate(),
    };
  });
}

function inferKind(event) {
  const raw = `${event.kind || ""} ${event.title || ""} ${event.subtitle || ""}`.toLowerCase();
  if (raw.includes("exam")) return "examination";
  if (raw.includes("assign")) return "assignment";
  if (raw.includes("regist")) return "registration";
  if (raw.includes("fee") || raw.includes("payment") || raw.includes("pay")) return "payment";
  if (event.kind === "deadline" || event.kind === "reminder" || event.kind === "action") {
    return event.kind;
  }
  return "event";
}

function buildMonthCells(cursor) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Monday-first: JS Sunday=0 → convert to Mon=0 … Sun=6
  const startOffset = (first.getDay() + 6) % 7;
  const cells = [];

  for (let i = 0; i < startOffset; i += 1) {
    cells.push({ key: `pad-start-${i}`, dateKey: null, day: null, inMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = `${year}-${pad2(month + 1)}-${pad2(day)}`;
    cells.push({ key: dateKey, dateKey, day, inMonth: true });
  }

  while (cells.length % 7 !== 0) {
    cells.push({
      key: `pad-end-${cells.length}`,
      dateKey: null,
      day: null,
      inMonth: false,
    });
  }

  return cells;
}

function asList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.events)) return payload.events;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.action_items)) return payload.action_items;
  if (Array.isArray(payload?.reminders)) return payload.reminders;
  return [];
}

function normalizeEvent(raw, index = 0) {
  const dateKey =
    toDateKey(raw.date) ||
    toDateKey(raw.event_date) ||
    toDateKey(raw.due_date) ||
    toDateKey(raw.scheduled_at) ||
    toDateKey(raw.start_at) ||
    toDateKey(raw.normalized_date);

  const noticeId = raw.noticeId || raw.notice_id || raw.source_notice_id || null;
  const title =
    raw.title ||
    raw.noticeTitle ||
    raw.notice_title ||
    raw.label ||
    raw.name ||
    "Untitled event";
  const subtitle =
    raw.subtitle ||
    raw.label ||
    raw.description ||
    raw.originalDate ||
    raw.original_date ||
    raw.context ||
    "";

  return {
    id: String(raw.id || `${noticeId || "event"}-${dateKey || "na"}-${index}`),
    dateKey,
    title,
    subtitle,
    noticeId,
    urgency: raw.urgency || raw.priority || raw.type || "upcoming",
    kind: raw.kind || raw.type || "event",
    source: raw.source || "api",
  };
}

function deadlineToEvent(item, index) {
  return normalizeEvent(
    {
      id: `session-${item.noticeId}-${item.date}-${item.label}-${index}`,
      date: item.date,
      title: item.noticeTitle,
      label: item.label,
      originalDate: item.originalDate,
      noticeId: item.noticeId,
      urgency: item.urgency,
      kind: "deadline",
      source: "session",
    },
    index
  );
}

function sortByDateThenTitle(a, b) {
  if (a.dateKey === b.dateKey) {
    return String(a.title).localeCompare(String(b.title));
  }
  if (!a.dateKey) return 1;
  if (!b.dateKey) return -1;
  return a.dateKey < b.dateKey ? -1 : 1;
}

export default function CalendarPage() {
  const {
    authToken,
    dashboardStats,
    openNoticeAnalysis,
    setView,
  } = useApp();

  const [todayKey] = useState(() => toDateKey(new Date()));
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [mode, setMode] = useState("month");
  const [events, setEvents] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderAt, setReminderAt] = useState("");
  const [reminderNoticeId, setReminderNoticeId] = useState("");
  const [creatingReminder, setCreatingReminder] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAuthenticated() {
      setLoading(true);
      setError("");
      try {
        const monthStart = `${cursor.getFullYear()}-${pad2(cursor.getMonth() + 1)}-01`;
        const monthEnd = toDateKey(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0));
        const [eventsPayload, actionsPayload, remindersPayload] = await Promise.all([
          fetchCalendarEvents(authToken, { from: monthStart, to: monthEnd }),
          fetchActionItems(authToken),
          fetchReminders(authToken),
        ]);
        if (cancelled) return;

        const nextEvents = asList(eventsPayload).map(normalizeEvent);
        const nextActions = asList(actionsPayload);
        const nextReminders = asList(remindersPayload);

        const reminderEvents = nextReminders
          .map((item, index) =>
            normalizeEvent(
              {
                ...item,
                id: `reminder-${item.id || index}`,
                title: item.title || item.message || "Reminder",
                date: item.scheduled_at || item.remind_at,
                kind: "reminder",
                urgency: "reminder",
              },
              index
            )
          )
          .filter((item) => item.dateKey);

        const actionEvents = nextActions
          .filter((item) => item.due_date || item.dueDate)
          .map((item, index) =>
            normalizeEvent(
              {
                ...item,
                id: `action-${item.id || index}`,
                title: item.title || item.description || "Action item",
                date: item.due_date || item.dueDate,
                kind: "action",
                urgency: item.status === "completed" ? "later" : "urgent",
              },
              index
            )
          );

        setEvents([...nextEvents, ...reminderEvents, ...actionEvents].sort(sortByDateThenTitle));
        setActionItems(nextActions);
        setReminders(nextReminders);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load calendar data.");
          setEvents([]);
          setActionItems([]);
          setReminders([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (!authToken) {
      const sessionEvents = (dashboardStats?.upcomingDeadlines || []).map(deadlineToEvent);
      setEvents(sessionEvents.sort(sortByDateThenTitle));
      setActionItems([]);
      setReminders([]);
      setLoading(false);
      setError("");
      return undefined;
    }

    loadAuthenticated();
    return () => {
      cancelled = true;
    };
  }, [authToken, cursor, dashboardStats]);

  const eventsByDate = useMemo(() => {
    const map = new Map();
    for (const event of events) {
      if (!event.dateKey) continue;
      if (!map.has(event.dateKey)) map.set(event.dateKey, []);
      map.get(event.dateKey).push(event);
    }
    return map;
  }, [events]);

  const monthCells = useMemo(() => buildMonthCells(cursor), [cursor]);
  const weekDays = useMemo(() => buildWeekDays(weekAnchor), [weekAnchor]);

  const selectedEvents = useMemo(
    () => (selectedDate ? eventsByDate.get(selectedDate) || [] : []),
    [eventsByDate, selectedDate]
  );

  const agendaEvents = useMemo(() => {
    const inMonthPrefix = `${cursor.getFullYear()}-${pad2(cursor.getMonth() + 1)}`;
    return events
      .filter((event) => event.dateKey && event.dateKey.startsWith(inMonthPrefix))
      .sort(sortByDateThenTitle);
  }, [events, cursor]);

  const weekEvents = useMemo(() => {
    const keys = new Set(weekDays.map((day) => day.dateKey));
    return events
      .filter((event) => event.dateKey && keys.has(event.dateKey))
      .sort(sortByDateThenTitle);
  }, [events, weekDays]);

  const openActions = useMemo(
    () =>
      actionItems.filter((item) => {
        const status = String(item.status || "").toLowerCase();
        return status !== "completed" && status !== "done";
      }),
    [actionItems]
  );

  const hasAnything =
    events.length > 0 || openActions.length > 0 || reminders.length > 0;

  async function handleCompleteAction(item) {
    if (!authToken || !item?.id) return;
    setBusyId(item.id);
    setError("");
    try {
      await updateActionItem(authToken, item.id, { status: "completed" });
      setActionItems((prev) =>
        prev.map((row) =>
          row.id === item.id ? { ...row, status: "completed" } : row
        )
      );
      setEvents((prev) =>
        prev.map((event) =>
          event.id === `action-${item.id}`
            ? { ...event, urgency: "later" }
            : event
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update action item.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreateReminder(event) {
    event.preventDefault();
    if (!authToken || !reminderAt) return;
    setCreatingReminder(true);
    setError("");
    try {
      const payload = {
        title: reminderTitle.trim() || "Reminder",
        scheduled_at: new Date(reminderAt).toISOString(),
      };
      if (reminderNoticeId.trim()) {
        payload.notice_id = reminderNoticeId.trim();
      }
      const created = await createReminder(authToken, payload);
      setReminders((prev) => [created, ...prev]);
      const normalized = normalizeEvent({
        ...created,
        id: `reminder-${created.id || Date.now()}`,
        title: created.title || payload.title,
        date: created.scheduled_at || payload.scheduled_at,
        kind: "reminder",
        urgency: "reminder",
      });
      if (normalized.dateKey) {
        setEvents((prev) => [...prev, normalized].sort(sortByDateThenTitle));
        setSelectedDate(normalized.dateKey);
      }
      setReminderTitle("");
      setReminderAt("");
      setReminderNoticeId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create reminder.");
    } finally {
      setCreatingReminder(false);
    }
  }

  function renderEventRow(event) {
    const kind = inferKind(event);
    return (
      <div
        key={event.id}
        className="flex flex-col gap-2 rounded-xl border border-border px-4 py-3 transition-shadow hover:shadow-[var(--shadow-soft)] sm:flex-row sm:items-center sm:justify-between dark:border-mint/15"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`size-2 shrink-0 rounded-full ${KIND_DOT[kind] || KIND_DOT.event}`}
              aria-hidden="true"
            />
            <p className="truncate text-sm font-semibold text-ink dark:text-canvas">
              {event.title}
            </p>
          </div>
          <p className="mt-0.5 pl-4 text-xs text-ink-muted dark:text-mint/65">
            {event.subtitle || formatDisplayDate(event.dateKey)}
            {` · ${String(kind).replaceAll("_", " ")}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={urgencyTone[event.urgency] || "neutral"}>
            {String(event.urgency || "event").replaceAll("_", " ")}
          </Badge>
          {event.noticeId && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => openNoticeAnalysis(event.noticeId)}
            >
              Open notice
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!loading && !hasAnything && !error) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="No deadlines to show"
        description={
          authToken
            ? "Saved calendar events, action items, and reminders will appear here once notices have dates."
            : "Verified action deadlines from analyzed notices will appear here. Sign in to sync a full calendar with reminders."
        }
        actionLabel="Upload Notice"
        onAction={() => setView("upload")}
      />
    );
  }

  return (
    <div className="space-y-4 slide-up">
      <PageHeader
        eyebrow={authToken ? "Synced calendar" : "Session deadlines"}
        title={
          mode === "week"
            ? `Week of ${formatDisplayDate(weekDays[0]?.dateKey)}`
            : formatMonthLabel(cursor)
        }
        description={
          authToken
            ? "Events, action items, and reminders from your saved notices."
            : "Showing upcoming deadlines from this browser session. Sign in for the full calendar."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-md border border-border bg-canvas p-1 dark:border-mint/20 dark:bg-forest-deep">
              {["month", "week", "agenda"].map((value) => (
                <Button
                  key={value}
                  size="sm"
                  variant={mode === value ? "primary" : "ghost"}
                  onClick={() => setMode(value)}
                  aria-pressed={mode === value}
                >
                  {value === "month" ? "Month" : value === "week" ? "Week" : "Agenda"}
                </Button>
              ))}
            </div>
            <div className="inline-flex items-center gap-1">
              <Button
                size="icon"
                variant="secondary"
                aria-label={mode === "week" ? "Previous week" : "Previous month"}
                onClick={() => {
                  if (mode === "week") {
                    setWeekAnchor((value) => {
                      const next = new Date(value);
                      next.setDate(next.getDate() - 7);
                      return next;
                    });
                  } else {
                    setCursor((value) => shiftMonth(value, -1));
                  }
                }}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const now = new Date();
                  setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
                  setWeekAnchor(now);
                  setSelectedDate(toDateKey(now));
                }}
              >
                Today
              </Button>
              <Button
                size="icon"
                variant="secondary"
                aria-label={mode === "week" ? "Next week" : "Next month"}
                onClick={() => {
                  if (mode === "week") {
                    setWeekAnchor((value) => {
                      const next = new Date(value);
                      next.setDate(next.getDate() + 7);
                      return next;
                    });
                  } else {
                    setCursor((value) => shiftMonth(value, 1));
                  }
                }}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        }
      />

      <div className="flex flex-wrap gap-3 text-[11px] text-ink-muted dark:text-mint/60">
        {[
          ["examination", "Examinations"],
          ["assignment", "Assignments"],
          ["registration", "Registration"],
          ["payment", "Payments"],
          ["deadline", "Deadlines"],
          ["event", "Events"],
        ].map(([key, label]) => (
          <span key={key} className="inline-flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${KIND_DOT[key]}`} aria-hidden="true" />
            {label}
          </span>
        ))}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}

      {loading && (
        <p className="text-sm text-ink-muted dark:text-mint/65">Loading calendar…</p>
      )}

      {mode === "month" && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]">
          <Card>
            <CardBody className="space-y-3">
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map((label) => (
                  <div
                    key={label}
                    className="px-1 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-ink-muted dark:text-mint/60"
                  >
                    {label}
                  </div>
                ))}
                {monthCells.map((cell) => {
                  if (!cell.inMonth) {
                    return (
                      <div
                        key={cell.key}
                        className="min-h-[4.5rem] rounded-md bg-canvas/40 dark:bg-forest-deep/30"
                      />
                    );
                  }
                  const dayEvents = eventsByDate.get(cell.dateKey) || [];
                  const selected = cell.dateKey === selectedDate;
                  const isToday = cell.dateKey === todayKey;
                  return (
                    <button
                      key={cell.key}
                      type="button"
                      onClick={() => setSelectedDate(cell.dateKey)}
                      className={`flex min-h-[4.5rem] flex-col items-start rounded-md border px-2 py-1.5 text-left transition-colors ${
                        selected
                          ? "border-forest bg-mint-soft dark:border-mint dark:bg-mint/10"
                          : "border-border bg-surface hover:border-forest/40 hover:bg-mint-soft/40 dark:border-mint/15 dark:bg-forest dark:hover:border-mint/40"
                      }`}
                    >
                      <span
                        className={`inline-flex size-6 items-center justify-center rounded-md text-xs font-semibold ${
                          isToday
                            ? "bg-forest text-canvas dark:bg-mint dark:text-forest"
                            : "text-ink dark:text-canvas"
                        }`}
                      >
                        {cell.day}
                      </span>
                      <div className="mt-1 flex w-full flex-col gap-0.5">
                        {dayEvents.slice(0, 2).map((event) => (
                          <span
                            key={event.id}
                            className="truncate rounded bg-canvas px-1 py-0.5 text-[10px] font-medium text-ink dark:bg-forest-deep dark:text-mint"
                          >
                            {event.title}
                          </span>
                        ))}
                        {dayEvents.length > 2 && (
                          <span className="text-[10px] font-semibold text-ink-muted dark:text-mint/65">
                            +{dayEvents.length - 2} more
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-editorial text-2xl text-ink dark:text-canvas">
                {selectedDate ? formatDisplayDate(selectedDate) : "Select a day"}
              </h3>
              <p className="mt-1 text-sm text-ink-muted dark:text-mint/65">
                {selectedEvents.length === 0
                  ? "No events on this day."
                  : `${selectedEvents.length} event${selectedEvents.length === 1 ? "" : "s"}`}
              </p>
            </CardHeader>
            <CardBody className="space-y-3">
              {selectedEvents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-canvas/60 px-4 py-8 text-center text-sm text-ink-muted dark:border-mint/20 dark:bg-forest-deep/40 dark:text-mint/65">
                  Pick another day or upload a notice with deadlines.
                </div>
              ) : (
                selectedEvents.map(renderEventRow)
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {mode === "week" && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]">
          <Card>
            <CardBody>
              <div className="grid gap-2 sm:grid-cols-7">
                {weekDays.map((day) => {
                  const dayEvents = eventsByDate.get(day.dateKey) || [];
                  const selected = day.dateKey === selectedDate;
                  const isToday = day.dateKey === todayKey;
                  return (
                    <button
                      key={day.dateKey}
                      type="button"
                      onClick={() => setSelectedDate(day.dateKey)}
                      className={`flex min-h-[8rem] flex-col rounded-xl border p-2 text-left transition-colors ${
                        selected
                          ? "border-forest bg-mint-soft dark:border-mint dark:bg-mint/10"
                          : "border-border hover:bg-canvas dark:border-mint/15 dark:hover:bg-forest-deep"
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">
                        {day.label}
                      </span>
                      <span
                        className={`mt-1 inline-flex size-7 items-center justify-center rounded-lg text-sm font-semibold ${
                          isToday
                            ? "bg-forest text-canvas dark:bg-mint dark:text-forest"
                            : "text-ink dark:text-canvas"
                        }`}
                      >
                        {day.day}
                      </span>
                      <div className="mt-2 space-y-1">
                        {dayEvents.slice(0, 3).map((event) => (
                          <span
                            key={event.id}
                            className="block truncate rounded bg-canvas px-1.5 py-0.5 text-[10px] font-medium dark:bg-forest-deep"
                          >
                            {event.title}
                          </span>
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-[10px] text-ink-muted">
                            +{dayEvents.length - 3} more
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <h3 className="font-editorial text-2xl">
                {selectedDate ? formatDisplayDate(selectedDate) : "Select a day"}
              </h3>
              <p className="mt-1 text-sm text-ink-muted dark:text-mint/65">
                {weekEvents.length} event{weekEvents.length === 1 ? "" : "s"} this week
              </p>
            </CardHeader>
            <CardBody className="space-y-3">
              {selectedEvents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-ink-muted dark:border-mint/20">
                  No events on the selected day.
                </div>
              ) : (
                selectedEvents.map(renderEventRow)
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {mode === "agenda" && (
        <Card>
          <CardHeader>
            <h3 className="font-editorial text-2xl text-ink dark:text-canvas">
              Agenda · {formatMonthLabel(cursor)}
            </h3>
            <p className="mt-1 text-sm text-ink-muted dark:text-mint/65">
              Chronological list of deadlines and events this month.
            </p>
          </CardHeader>
          <CardBody className="space-y-3">
            {agendaEvents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-canvas/60 px-4 py-8 text-center text-sm text-ink-muted dark:border-mint/20 dark:bg-forest-deep/40 dark:text-mint/65">
                Nothing scheduled in this month yet.
              </div>
            ) : (
              agendaEvents.map((event) => (
                <div key={event.id} className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted dark:text-mint/60">
                    {formatDisplayDate(event.dateKey)}
                  </p>
                  {renderEventRow(event)}
                </div>
              ))
            )}
          </CardBody>
        </Card>
      )}

      {authToken && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <h3 className="font-editorial text-2xl text-ink dark:text-canvas">
                Action items
              </h3>
              <p className="mt-1 text-sm text-ink-muted dark:text-mint/65">
                Mark extracted tasks complete when you finish them.
              </p>
            </CardHeader>
            <CardBody className="space-y-3">
              {openActions.length === 0 ? (
                <p className="text-sm text-ink-muted dark:text-mint/65">
                  No open action items.
                </p>
              ) : (
                openActions.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-2 rounded-md border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-mint/15"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink dark:text-canvas">
                        {item.title || item.description || "Action item"}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-muted dark:text-mint/65">
                        {item.due_date || item.dueDate
                          ? `Due ${formatDisplayDate(item.due_date || item.dueDate)}`
                          : "No due date"}
                        {item.priority ? ` · ${item.priority}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(item.notice_id || item.noticeId) && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            openNoticeAnalysis(item.notice_id || item.noticeId)
                          }
                        >
                          Open notice
                        </Button>
                      )}
                      <Button
                        size="sm"
                        disabled={busyId === item.id}
                        onClick={() => handleCompleteAction(item)}
                      >
                        <Check className="size-3.5" />
                        {busyId === item.id ? "Saving…" : "Complete"}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-editorial text-2xl text-ink dark:text-canvas">
                Reminders
              </h3>
              <p className="mt-1 text-sm text-ink-muted dark:text-mint/65">
                Schedule a reminder so you do not miss a deadline.
              </p>
            </CardHeader>
            <CardBody className="space-y-4">
              <form className="space-y-3" onSubmit={handleCreateReminder}>
                <Field label="Title">
                  <Input
                    id="reminder-title"
                    value={reminderTitle}
                    onChange={(event) => setReminderTitle(event.target.value)}
                    placeholder="Submit exam form"
                  />
                </Field>
                <Field label="Remind at">
                  <Input
                    id="reminder-at"
                    type="datetime-local"
                    required
                    value={reminderAt}
                    onChange={(event) => setReminderAt(event.target.value)}
                  />
                </Field>
                <Field label="Notice ID (optional)">
                  <Input
                    id="reminder-notice"
                    value={reminderNoticeId}
                    onChange={(event) => setReminderNoticeId(event.target.value)}
                    placeholder="Link to a saved notice"
                  />
                </Field>
                <Button type="submit" disabled={creatingReminder || !reminderAt}>
                  {creatingReminder ? "Creating…" : "Create reminder"}
                </Button>
              </form>

              <div className="space-y-2 border-t border-border pt-4 dark:border-mint/15">
                {reminders.length === 0 ? (
                  <p className="text-sm text-ink-muted dark:text-mint/65">
                    No reminders scheduled yet.
                  </p>
                ) : (
                  reminders.slice(0, 8).map((item) => (
                    <div
                      key={item.id}
                      className="rounded-md border border-border px-3 py-2 dark:border-mint/15"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-ink dark:text-canvas">
                          {item.title || item.message || "Reminder"}
                        </p>
                        <Badge tone="forest">
                          {String(item.status || "scheduled").replaceAll("_", " ")}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-ink-muted dark:text-mint/65">
                        {formatDisplayDate(item.scheduled_at || item.remind_at)}
                      </p>
                      {(item.notice_id || item.noticeId) && (
                        <Button
                          className="mt-2"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            openNoticeAnalysis(item.notice_id || item.noticeId)
                          }
                        >
                          Open notice
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {!authToken && events.length > 0 && (
        <Card>
          <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-editorial text-xl text-ink dark:text-canvas">
                Want reminders and synced events?
              </p>
              <p className="mt-1 text-sm text-ink-muted dark:text-mint/65">
                Sign in to load your calendar from the server and create reminders.
              </p>
            </div>
            <Button variant="secondary" onClick={() => setView("auth")}>
              Sign in
            </Button>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
