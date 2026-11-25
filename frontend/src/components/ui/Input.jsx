export function Input({ className = "", ...props }) {
  return <input className={`ui-input ${className}`} {...props} />;
}

export function Select({ className = "", children, ...props }) {
  return (
    <select className={`ui-input appearance-none pr-8 ${className}`} {...props}>
      {children}
    </select>
  );
}

export function TextArea({ className = "", ...props }) {
  return <textarea className={`ui-input min-h-24 resize-y ${className}`} {...props} />;
}

export function Field({ label, hint, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      {label && (
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted dark:text-mint/60">
          {label}
        </span>
      )}
      {children}
      {hint && (
        <span className="mt-1.5 block text-xs text-ink-faint dark:text-mint/50">{hint}</span>
      )}
    </label>
  );
}

export default Input;
