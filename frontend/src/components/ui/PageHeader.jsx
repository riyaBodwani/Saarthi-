export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className = "",
}) {
  return (
    <div
      className={`mb-7 flex flex-col gap-4 sm:mb-9 sm:flex-row sm:items-end sm:justify-between ${className}`}
    >
      <div className="min-w-0 max-w-2xl">
        {eyebrow && (
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-faint dark:text-mint/50">
            {eyebrow}
          </p>
        )}
        {title && (
          <h2 className="font-editorial text-[1.85rem] text-ink dark:text-canvas sm:text-[2.15rem]">
            {title}
          </h2>
        )}
        {description && (
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted dark:text-mint/60">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export default PageHeader;
