const variants = {
  primary:
    "bg-forest text-canvas shadow-[0_1px_2px_rgb(16_43_37_/_0.12)] hover:bg-forest-soft active:translate-y-px dark:bg-mint dark:text-forest dark:hover:bg-white",
  secondary:
    "border border-border bg-surface text-ink hover:border-border-strong hover:bg-stone active:translate-y-px dark:border-mint/18 dark:bg-transparent dark:text-canvas dark:hover:bg-forest-deep/80",
  ghost:
    "text-ink-muted hover:bg-stone hover:text-ink dark:text-mint/70 dark:hover:bg-forest-deep dark:hover:text-canvas",
  danger:
    "border border-danger/20 bg-danger-soft text-danger hover:bg-danger/10 active:translate-y-px",
  soft:
    "bg-mint-soft text-forest hover:bg-mint/70 active:translate-y-px dark:bg-mint/12 dark:text-mint dark:hover:bg-mint/20",
};

const sizes = {
  sm: "h-8 rounded-lg px-3 text-xs",
  md: "h-10 rounded-xl px-4 text-sm",
  lg: "h-11 rounded-xl px-5 text-sm",
  icon: "size-9 rounded-xl p-0",
  "icon-sm": "size-8 rounded-lg p-0",
};

export function Button({
  as: Component = "button",
  variant = "primary",
  size = "md",
  className = "",
  children,
  type,
  ...props
}) {
  const resolvedType = Component === "button" ? type || "button" : type;
  return (
    <Component
      type={resolvedType}
      className={`inline-flex items-center justify-center gap-2 font-medium tracking-[-0.01em] transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none disabled:active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest dark:focus-visible:outline-mint ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

export default Button;
