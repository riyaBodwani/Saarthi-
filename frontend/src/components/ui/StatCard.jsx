import { Card } from "./Card";

export function StatCard({ label, value, hint, icon: Icon, accent = "mint" }) {
  const accents = {
    mint: "text-forest dark:text-mint",
    gold: "text-gold",
    forest: "text-forest dark:text-mint",
  };

  return (
    <Card className="overflow-hidden p-0">
      <div className="px-5 py-5 sm:px-5 sm:py-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint dark:text-mint/50">
            {label}
          </p>
          {Icon && (
            <Icon
              className={`size-4 opacity-70 ${accents[accent] || accents.mint}`}
              aria-hidden="true"
              strokeWidth={1.75}
            />
          )}
        </div>
        <p className="mt-3 font-editorial text-[2.35rem] leading-none tracking-tight text-ink tabular dark:text-canvas">
          {value}
        </p>
        {hint && (
          <p className="mt-2.5 text-xs leading-relaxed text-ink-muted dark:text-mint/55">
            {hint}
          </p>
        )}
      </div>
      <div
        className={`h-px w-full ${
          accent === "gold"
            ? "bg-gradient-to-r from-gold/50 to-transparent"
            : accent === "forest"
              ? "bg-gradient-to-r from-forest/25 to-transparent dark:from-mint/30"
              : "bg-gradient-to-r from-mint/60 to-transparent"
        }`}
        aria-hidden="true"
      />
    </Card>
  );
}

export default StatCard;
