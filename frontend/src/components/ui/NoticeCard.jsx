import { FileText } from "lucide-react";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { Card, CardBody } from "./Card";

const urgencyTone = {
  overdue: "danger",
  due_today: "gold",
  urgent: "warning",
  upcoming: "mint",
  later: "neutral",
  unknown: "neutral",
};

function formatShortDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function NoticeCard({
  notice,
  onOpen,
  actions,
  compact = false,
}) {
  const urgency = notice.analysis?.overall_urgency || "unknown";
  const nextDeadline = (notice.importantDates || []).find(
    (item) => item.type === "deadline" && item.normalized_date
  );

  return (
    <Card interactive className="overflow-hidden">
      <CardBody
        className={`flex flex-col gap-3 ${compact ? "" : "sm:flex-row sm:items-center sm:justify-between"}`}
      >
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-stone text-forest dark:border-mint/10 dark:bg-forest-deep dark:text-mint">
            <FileText className="size-4" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-semibold tracking-tight text-ink dark:text-canvas sm:text-[0.95rem]">
                {notice.title}
              </h3>
              <Badge tone="neutral">{notice.category || "Notice"}</Badge>
              {urgency !== "unknown" && (
                <Badge tone={urgencyTone[urgency] || "neutral"}>
                  {String(urgency).replace("_", " ")}
                </Badge>
              )}
              {notice.favorite && <Badge tone="gold">Favorite</Badge>}
            </div>
            <p className="mt-1.5 text-xs text-ink-muted dark:text-mint/55">
              {formatShortDate(notice.uploadedAt)}
              {notice.language ? ` · ${notice.language}` : ""}
              {nextDeadline
                ? ` · ${nextDeadline.label || "Deadline"} ${nextDeadline.normalized_date}`
                : ""}
            </p>
            {!compact && notice.summary && (
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-muted dark:text-mint/65">
                {notice.summary}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:pl-0">
          {onOpen && (
            <Button size="sm" variant="secondary" onClick={() => onOpen(notice.id)}>
              Open
            </Button>
          )}
          {actions}
        </div>
      </CardBody>
    </Card>
  );
}

export default NoticeCard;
