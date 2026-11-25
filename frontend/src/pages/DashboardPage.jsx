import {
  CalendarClock,
  CheckCircle2,
  FileStack,
  ListTodo,
  Upload,
} from "lucide-react";
import { useApp } from "../hooks/useApp";
import { Button } from "../components/ui/Button";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { DeadlineCard } from "../components/ui/DeadlineCard";
import { EmptyState } from "../components/ui/EmptyState";
import { NoticeCard } from "../components/ui/NoticeCard";
import { StatCard } from "../components/ui/StatCard";

function greetingForNow(now = new Date()) {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatShortDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

export default function DashboardPage() {
  const { setView, dashboardStats, openNoticeAnalysis, currentUser } = useApp();
  const {
    totalNotices,
    upcomingDeadlineCount,
    pendingActions,
    noticesThisMonth,
    upcomingDeadlines,
    recentNotices,
  } = dashboardStats;

  const hasData = totalNotices > 0;
  const name = currentUser?.name?.split(" ")[0];

  return (
    <div className="space-y-8 slide-up">
      <section className="relative overflow-hidden rounded-[1.35rem] border border-border/80 bg-surface dark:border-mint/10 dark:bg-forest/60">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(ellipse at 100% 0%, rgba(197,232,193,0.28), transparent 48%), radial-gradient(ellipse at 0% 100%, rgba(232,185,106,0.1), transparent 40%)",
          }}
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-6 px-6 py-7 sm:flex-row sm:items-end sm:justify-between sm:px-8 sm:py-8">
          <div className="max-w-xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-faint dark:text-mint/50">
              Your workspace
            </p>
            <h2 className="mt-2 font-editorial text-[2.15rem] leading-[1.1] text-ink dark:text-canvas sm:text-[2.5rem]">
              {greetingForNow()}
              {name ? `, ${name}` : ""}.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted dark:text-mint/60">
              Understand your college notices with calm clarity. Never miss what matters.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setView("upload")}>
              <Upload className="size-4" aria-hidden="true" strokeWidth={1.75} />
              Upload notice
            </Button>
            <Button variant="secondary" onClick={() => setView("notices")}>
              Browse library
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total notices"
          value={totalNotices}
          hint={hasData ? "In this workspace" : "Waiting for your first upload"}
          icon={FileStack}
          accent="forest"
        />
        <StatCard
          label="Upcoming deadlines"
          value={upcomingDeadlineCount}
          hint="Verified action deadlines"
          icon={CalendarClock}
          accent="gold"
        />
        <StatCard
          label="Pending actions"
          value={pendingActions}
          hint="Extracted from analyses"
          icon={ListTodo}
          accent="mint"
        />
        <StatCard
          label="This month"
          value={noticesThisMonth}
          hint="Notices added this month"
          icon={CheckCircle2}
          accent="mint"
        />
      </section>

      {!hasData ? (
        <EmptyState
          icon={Upload}
          title="A quiet place to begin"
          description="Upload a college circular, exam notice, or timetable. Saarthi will extract what matters — deadlines, actions, and a clear summary."
          actionLabel="Upload your first notice"
          onAction={() => setView("upload")}
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-5">
          <div className="space-y-6 xl:col-span-3">
            <Card>
              <CardHeader className="flex flex-row items-end justify-between gap-3">
                <div>
                  <h3 className="font-editorial text-2xl text-ink dark:text-canvas">
                    Recent notices
                  </h3>
                  <p className="mt-1 text-sm text-ink-muted dark:text-mint/55">
                    Latest analyses in this workspace.
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setView("notices")}>
                  View all
                </Button>
              </CardHeader>
              <CardBody className="space-y-3">
                {recentNotices.map((notice) => (
                  <NoticeCard
                    key={notice.id}
                    notice={notice}
                    compact
                    onOpen={openNoticeAnalysis}
                  />
                ))}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="font-editorial text-2xl text-ink dark:text-canvas">
                  Upcoming deadlines
                </h3>
                <p className="mt-1 text-sm text-ink-muted dark:text-mint/55">
                  Sourced from verified deadline dates only.
                </p>
              </CardHeader>
              <CardBody className="space-y-2">
                {upcomingDeadlines.length === 0 ? (
                  <p className="text-sm text-ink-muted">No upcoming verified deadlines.</p>
                ) : (
                  upcomingDeadlines.map((item) => (
                    <DeadlineCard
                      key={`${item.noticeId}-${item.date}-${item.label}`}
                      title={item.noticeTitle}
                      subtitle={item.label}
                      dateLabel={item.originalDate || item.date}
                      urgency={item.urgency}
                      onOpen={() => openNoticeAnalysis(item.noticeId)}
                    />
                  ))
                )}
              </CardBody>
            </Card>
          </div>

          <div className="space-y-6 xl:col-span-2">
            <Card>
              <CardHeader>
                <h3 className="font-editorial text-2xl text-ink dark:text-canvas">
                  Calendar
                </h3>
                <p className="mt-1 text-sm text-ink-muted dark:text-mint/55">
                  Next verified dates at a glance.
                </p>
              </CardHeader>
              <CardBody className="space-y-2.5">
                {upcomingDeadlines.length === 0 ? (
                  <p className="text-sm text-ink-muted">Nothing scheduled yet.</p>
                ) : (
                  upcomingDeadlines.slice(0, 4).map((item) => (
                    <button
                      key={`cal-${item.noticeId}-${item.date}`}
                      type="button"
                      onClick={() => openNoticeAnalysis(item.noticeId)}
                      className="flex w-full items-center gap-3 rounded-xl border border-border/80 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-stone/50 dark:border-mint/10 dark:hover:bg-forest-deep"
                    >
                      <div className="flex size-11 flex-col items-center justify-center rounded-lg bg-stone text-forest dark:bg-mint/10 dark:text-mint">
                        <span className="text-[9px] font-medium uppercase tracking-wide text-ink-faint dark:text-mint/55">
                          {formatShortDate(item.date).split(" ")[1] || "—"}
                        </span>
                        <span className="font-editorial text-lg leading-none tabular">
                          {formatShortDate(item.date).split(" ")[0] || "—"}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.label}</p>
                        <p className="truncate text-xs text-ink-muted">{item.noticeTitle}</p>
                      </div>
                    </button>
                  ))
                )}
                <Button
                  variant="secondary"
                  className="mt-1 w-full"
                  onClick={() => setView("calendar")}
                >
                  Open calendar
                </Button>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="font-editorial text-2xl text-ink dark:text-canvas">
                  Pending actions
                </h3>
              </CardHeader>
              <CardBody className="space-y-2">
                {recentNotices
                  .flatMap((notice) =>
                    (notice.actionItems || []).slice(0, 2).map((item, index) => ({
                      id: `${notice.id}-${index}`,
                      noticeId: notice.id,
                      text: item,
                      noticeTitle: notice.title,
                    }))
                  )
                  .slice(0, 5)
                  .map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openNoticeAnalysis(item.noticeId)}
                      className="flex w-full items-start gap-2.5 rounded-xl border border-border/80 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-stone/50 dark:border-mint/10 dark:hover:bg-forest-deep"
                    >
                      <ListTodo
                        className="mt-0.5 size-4 shrink-0 text-forest dark:text-mint"
                        strokeWidth={1.75}
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{item.text}</span>
                        <span className="text-xs text-ink-muted">{item.noticeTitle}</span>
                      </span>
                    </button>
                  ))}
                {pendingActions === 0 && (
                  <p className="text-sm text-ink-muted">No pending action items yet.</p>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="font-editorial text-2xl text-ink dark:text-canvas">
                  Continue
                </h3>
              </CardHeader>
              <CardBody className="grid gap-2">
                <Button onClick={() => setView("upload")}>Upload notice</Button>
                <Button variant="secondary" onClick={() => setView("assistant")}>
                  Ask Saarthi
                </Button>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
