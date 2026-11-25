import { Badge } from "./Badge";
import { Button } from "./Button";

const urgencyTone = {
  overdue: "danger",
  due_today: "gold",
  urgent: "warning",
  upcoming: "mint",
  later: "neutral",
  unknown: "neutral",
};

export function DeadlineCard({
  title,
  subtitle,
  dateLabel,
  urgency = "unknown",
  onOpen,
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/80 bg-surface-2/60 px-4 py-3.5 transition-[border-color,background-color] duration-150 hover:border-border-strong hover:bg-stone/40 dark:border-mint/10 dark:bg-forest-deep/40 dark:hover:border-mint/22 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink dark:text-canvas">{title}</p>
        <p className="mt-0.5 text-xs text-ink-muted dark:text-mint/55">
          {subtitle}
          {dateLabel ? ` · ${dateLabel}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge tone={urgencyTone[urgency] || "neutral"}>
          {String(urgency).replace("_", " ")}
        </Badge>
        {onOpen && (
          <Button size="sm" variant="ghost" onClick={onOpen}>
            View
          </Button>
        )}
      </div>
    </div>
  );
}

export default DeadlineCard;
