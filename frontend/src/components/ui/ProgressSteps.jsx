import { Check, Loader2 } from "lucide-react";

export function ProgressSteps({ steps, activeIndex = -1, className = "" }) {
  return (
    <ol className={`space-y-2 ${className}`} aria-label="Processing stages">
      {steps.map((step, index) => {
        const complete = activeIndex > index;
        const active = activeIndex === index;
        return (
          <li
            key={step.id}
            className={`flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors ${
              active
                ? "border-forest/20 bg-mint-soft text-forest dark:border-mint/30 dark:bg-mint/10 dark:text-mint"
                : complete
                  ? "border-border bg-surface text-ink dark:border-mint/15 dark:bg-forest dark:text-canvas"
                  : "border-transparent text-ink-muted dark:text-mint/50"
            }`}
          >
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                active
                  ? "bg-forest text-canvas dark:bg-mint dark:text-forest"
                  : complete
                    ? "bg-mint text-forest"
                    : "bg-border/70 text-ink-muted dark:bg-mint/10"
              }`}
              aria-hidden="true"
            >
              {complete ? (
                <Check className="size-3.5" />
              ) : active ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                index + 1
              )}
            </span>
            <span className="font-medium">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default ProgressSteps;
