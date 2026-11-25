export function Card({
  className = "",
  children,
  as: Component = "div",
  interactive = false,
  ...props
}) {
  return (
    <Component
      className={`surface-card ${interactive ? "surface-card-interactive" : ""} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardHeader({ className = "", children }) {
  return <div className={`px-5 pt-5 sm:px-6 sm:pt-6 ${className}`}>{children}</div>;
}

export function CardBody({ className = "", children }) {
  return <div className={`px-5 py-4 sm:px-6 sm:pb-5 ${className}`}>{children}</div>;
}

export function CardFooter({ className = "", children }) {
  return (
    <div
      className={`border-t border-border/80 px-5 py-4 sm:px-6 dark:border-mint/10 ${className}`}
    >
      {children}
    </div>
  );
}

export default Card;
