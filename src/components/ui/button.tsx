"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-[#fbf7ee] hover:bg-accent-ink active:bg-accent-ink",
  secondary: "bg-accent-soft text-accent-ink hover:bg-[#e6c7cc]",
  ghost: "bg-transparent text-foreground border-2 border-dashed border-border hover:border-accent/40 hover:bg-black/5",
  danger: "bg-danger-soft text-danger border border-danger/20 hover:bg-[#eecbc2]",
  success: "bg-success-soft text-success hover:bg-[#c9e1d3]",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-lg",
  md: "h-11 px-4 text-[15px] rounded-xl",
  lg: "h-13 px-5 text-base rounded-xl",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) {
  return (
    <button ref={ref} disabled={disabled || loading} className={cn("inline-flex items-center justify-center gap-2 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed select-none", variants[variant], sizes[size], className)} {...props}>
      {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden /> : null}
      {children}
    </button>
  );
});
