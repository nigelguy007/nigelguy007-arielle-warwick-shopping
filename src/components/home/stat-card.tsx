import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * The one deliberate hero move on the home screen: a torn ticket stub carrying the
 * greeting and the two numbers that matter most (still needed, budget left). Everything
 * else on the page stays quiet by comparison.
 */
export function TicketHero({
  name,
  place,
  left,
  right,
}: {
  name: string;
  place?: string;
  left: { label: string; value: string; href: string };
  right: { label: string; value: string; sub?: string; href: string };
}) {
  return (
    <div className="card mt-1 overflow-hidden p-0">
      <div className="px-5 pt-5 pb-4">
        <p className="text-sm text-muted">{place ?? "Warwick move-in"}</p>
        <h1 className="font-display text-4xl leading-none font-bold tracking-tight">Hi {name}</h1>
      </div>
      <div className="stub-tear mx-5" />
      <div className="grid grid-cols-2 divide-x divide-border">
        <Link href={left.href} className="flex flex-col gap-0.5 px-5 py-4 active:bg-black/[0.03]">
          <span className="text-xs text-muted">{left.label}</span>
          <span className="font-display text-3xl leading-none font-bold text-accent-ink">{left.value}</span>
        </Link>
        <Link href={right.href} className="flex flex-col gap-0.5 px-5 py-4 active:bg-black/[0.03]">
          <span className="text-xs text-muted">{right.label}</span>
          <span className="font-display text-3xl leading-none font-bold text-success">{right.value}</span>
          {right.sub ? <span className="text-[11px] text-muted">{right.sub}</span> : null}
        </Link>
      </div>
    </div>
  );
}

/** Secondary stats: a plain row, not a second set of cards - keeps the hero the only bold move. */
export function StatRow({ items }: { items: { label: string; value: string; href: string }[] }) {
  return (
    <div className="mt-3 flex divide-x divide-border rounded-xl border border-border bg-card/60">
      {items.map((it) => (
        <Link key={it.href} href={it.href} className={cn("flex-1 px-4 py-3 text-center active:bg-black/[0.03]")}>
          <div className="text-lg font-bold">{it.value}</div>
          <div className="text-[11px] text-muted">{it.label}</div>
        </Link>
      ))}
    </div>
  );
}
