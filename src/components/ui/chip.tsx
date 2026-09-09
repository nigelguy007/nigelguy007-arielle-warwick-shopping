"use client";
import { cn } from "@/lib/utils";

export function Chip({ active, className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button type="button" aria-pressed={active} className={cn("tap shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors whitespace-nowrap", active ? "border-accent bg-accent text-white" : "border-border bg-card text-foreground hover:bg-black/5", className)} {...props}>
      {children}
    </button>
  );
}

export function ChipRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1", className)}>{children}</div>;
}
