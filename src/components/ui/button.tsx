"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-ink active:bg-accent-ink",
  secondary: "bg-accent-soft text-accent-ink hover:bg-[#ffd9cc]",
  ghost: "bg-transparent text-foreground border border-border hover:bg-black/5",
  danger: "bg-red-50 text-red-700 border border-red-100 hover:bg-red-100",
  success: "bg-success-soft text-success hover:bg-[#cdeedb]",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-xl",
  md: "h-11 px-4 text-[15px] rounded-2xl",
  lg: "h-13 px-5 text-base rounded-2xl",
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
