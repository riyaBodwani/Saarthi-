export function Tooltip({ label, children, className = "" }) {
  if (!label) return children;
  return (
    <span className={`group relative inline-flex ${className}`}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-40 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-ink px-2 py-1 text-[11px] font-medium text-canvas opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 dark:border-mint/20 dark:bg-canvas dark:text-ink"
      >
        {label}
      </span>
    </span>
  );
}

export default Tooltip;
