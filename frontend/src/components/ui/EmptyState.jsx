import { Button } from "./Button";

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}) {
  return (
    <div
      className={`fade-in flex flex-col items-center justify-center rounded-[1.35rem] border border-dashed border-border bg-surface/80 px-6 py-16 text-center dark:border-mint/14 dark:bg-forest/30 ${className}`}
    >
      {Icon && (
        <div className="mb-5 flex size-12 items-center justify-center rounded-2xl border border-border bg-stone text-forest dark:border-mint/12 dark:bg-forest-deep dark:text-mint">
          <Icon className="size-5" aria-hidden="true" strokeWidth={1.75} />
        </div>
      )}
      <h3 className="font-editorial text-2xl text-ink dark:text-canvas">{title}</h3>
      {description && (
        <p className="mt-2.5 max-w-md text-sm leading-relaxed text-ink-muted dark:text-mint/60">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button className="mt-6" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
