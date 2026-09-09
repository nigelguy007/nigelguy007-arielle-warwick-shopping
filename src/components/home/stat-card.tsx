import Link from "next/link";
import { cn } from "@/lib/utils";

export function StatCard({ label, value, sub, href, tone }: { label: string; value: string; sub?: string; href: string; tone?: "accent" | "success" | "neutral" }) {
  return (
    <Link href={href} className={cn("card flex flex-col gap-0.5 p-4 active:scale-[0.99]", tone === "accent" && "bg-accent-soft border-transparent", tone === "success" && "bg-success-soft border-transparent")}>
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      <span className="text-2xl font-bold tracking-tight">{value}</span>
      {sub ? <span className="text-xs text-muted">{sub}</span> : null}
    </Link>
  );
}
