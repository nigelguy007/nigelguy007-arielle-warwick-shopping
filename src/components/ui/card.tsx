import { cn } from "@/lib/utils";

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("card p-4", className)} {...props}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between px-1 pt-6 pb-2">
      <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{children}</h2>
      {action}
    </div>
  );
}
