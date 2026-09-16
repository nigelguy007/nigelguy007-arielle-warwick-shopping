import Link from "next/link";
import { CheckIcon } from "@/components/ui/icons";
import { gbp } from "@/lib/utils";

/** Home's Stitch-designed readiness summary: same real numbers the old
 * progress ring showed (sorted/total, budget left, to buy, packed), laid
 * out as a linear-progress glass card instead of a ring. */
export function ReadinessCard({ sorted, total, budgetRemaining, toBuy, packed }: { sorted: number; total: number; budgetRemaining: number | null; toBuy: number; packed: number }) {
  const pct = total > 0 ? Math.round((sorted / total) * 100) : 0;
  return (
    <div className="glass-card p-4">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent-soft text-accent-ink">
            <CheckIcon size={13} />
          </div>
          <div>
            <p className="text-[11px] leading-none font-bold tracking-wide text-muted uppercase">Move-in readiness</p>
            <p className="mt-0.5 text-xs font-bold">{sorted} of {total} items sorted</p>
          </div>
        </div>
        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-extrabold text-accent-ink">{pct}% ready</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--ring-track)" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--accent-deep), var(--accent))" }} />
      </div>
      <div className="tabular mt-3 grid grid-cols-3 gap-2 border-t border-border pt-2.5 text-center">
        <div>
          <p className="text-[10px] text-muted">Budget</p>
          <p className="text-xs font-bold">{budgetRemaining === null ? "—" : gbp(budgetRemaining)} <span className="font-normal text-muted">left</span></p>
        </div>
        <Link href="/checklist?filter=needed" className="focus-visible:outline-2 focus-visible:outline-accent">
          <p className="text-[10px] text-muted">To buy</p>
          <p className="text-xs font-bold text-warn">{toBuy} items</p>
        </Link>
        <Link href="/checklist?filter=packed" className="focus-visible:outline-2 focus-visible:outline-accent">
          <p className="text-[10px] text-muted">Packed</p>
          <p className="text-xs font-bold text-success">{packed} sorted</p>
        </Link>
      </div>
    </div>
  );
}
