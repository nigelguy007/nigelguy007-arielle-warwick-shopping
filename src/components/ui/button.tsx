"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

// Hover/active tints are derived from the token with color-mix rather than
// hardcoded hex - a real bug found in this pass: the old hex hovers
// (#e6c7cc, #eecbc2) were leftovers from the oxblood/pink palette and no
// longer related to the new blue accent at all once the tokens changed.
const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-ink active:bg-accent-ink",
  secondary: "bg-accent-soft text-accent-ink hover:bg-[color-mix(in_oklch,var(--accent-soft),var(--foreground)_12%)]",
  ghost: "bg-transparent text-foreground border-2 border-dashed border-border hover:border-accent/50 hover:bg-black/5",
  danger: "bg-danger-soft text-danger border border-danger/20 hover:bg-[color-mix(in_oklch,var(--danger-soft),var(--foreground)_10%)]",
  success: "bg-success-soft text-success hover:bg-[color-mix(in_oklch,var(--success-soft),var(--foreground)_10%)]",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-lg",
  md: "h-11 px-4 text-[15px] rounded-lg",
  lg: "h-13 px-5 text-base rounded-lg",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
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
