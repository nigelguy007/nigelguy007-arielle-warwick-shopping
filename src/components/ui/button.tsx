"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

// text-on-accent (not text-white): in dark mode the accent is a light teal,
// so on-accent text must be dark ink, not white - a real bug found in this
// pass carried over from the previous design system.
const variants: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-deep active:bg-accent-deep",
  secondary: "bg-accent-soft text-accent-ink hover:bg-[color-mix(in_oklch,var(--accent-soft),var(--foreground)_12%)]",
  ghost: "bg-transparent text-foreground border border-[var(--row-border)] hover:bg-black/5",
  danger: "text-white hover:opacity-90 active:opacity-80",
  success: "text-white hover:opacity-90 active:opacity-80",
};
const varStyle: Partial<Record<Variant, React.CSSProperties>> = {
  danger: { background: "var(--danger)" },
  success: { background: "var(--success)" },
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm rounded-full",
  md: "h-11 px-4.5 text-[15px] rounded-full",
  lg: "h-13 px-5 text-base rounded-2xl",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button({ className, style, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      style={{ ...varStyle[variant], ...style }}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden /> : null}
      {children}
    </button>
  );
});
