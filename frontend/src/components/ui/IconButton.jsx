import { Button } from "./Button";

export function IconButton({
  label,
  children,
  size = "icon",
  variant = "secondary",
  className = "",
  ...props
}) {
  return (
    <Button
      variant={variant}
      size={size}
      aria-label={label}
      title={label}
      className={className}
      {...props}
    >
      {children}
    </Button>
  );
}

export default IconButton;
