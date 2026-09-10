"use client";
import { cn } from "@/lib/utils";

export function Chip({ active, className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "tap shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        active ? "border-accent bg-accent text-white" : "border-border bg-card text-foreground hover:bg-black/5",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** Horizontally-scrolling chip row with a fade at both edges so overflowing
 * chips (e.g. Map's retailer filters) never look silently cut off. */
export function ChipRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn("no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1", className)}
      style={{ maskImage: "linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)", WebkitMaskImage: "linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)" }}
    >
      {children}
    </div>
  );
}
