const tones = {
  neutral:
    "border-border/80 bg-stone text-ink-muted dark:border-mint/12 dark:bg-forest-deep dark:text-mint/70",
  mint: "border-mint/40 bg-mint-soft text-forest dark:border-mint/20 dark:bg-mint/10 dark:text-mint",
  gold: "border-gold/35 bg-gold-soft text-ink dark:border-gold/25 dark:bg-gold/10 dark:text-gold",
  forest:
    "border-transparent bg-forest text-canvas dark:border-transparent dark:bg-mint dark:text-forest",
  danger:
    "border-danger/20 bg-danger-soft text-danger dark:border-red-400/25 dark:bg-red-950/30 dark:text-red-200",
  warning:
    "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-400/30 dark:bg-amber-950/25 dark:text-amber-100",
  success:
    "border-success/15 bg-success-soft text-success dark:border-mint/20 dark:bg-mint/10 dark:text-mint",
};

export function Badge({ tone = "neutral", className = "", children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] ${tones[tone] || tones.neutral} ${className}`}
    >
      {children}
    </span>
  );
}

export default Badge;
