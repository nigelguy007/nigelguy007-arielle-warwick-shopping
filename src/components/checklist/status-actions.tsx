"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ShoppingCart, PackageCheck, Home } from "lucide-react";
import { api } from "@/lib/client/api";
import { queueStatus } from "@/lib/client/offline-queue";
import { canTransition } from "@/lib/checklist/status";
import type { ChecklistStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const ACTIONS: Array<{ status: ChecklistStatus; label: string; icon: typeof Check; tone: string }> = [
  { status: "have", label: "Have it", icon: Home, tone: "bg-black/5 text-foreground" },
  { status: "buy", label: "Buy", icon: ShoppingCart, tone: "bg-accent-soft text-accent-ink" },
  { status: "bought", label: "Bought", icon: Check, tone: "bg-success-soft text-success" },
  { status: "packed", label: "Packed", icon: PackageCheck, tone: "bg-success text-white" },
];

export function StatusActions({ itemId, status, compact, onChange }: { itemId: string; status: ChecklistStatus; compact?: boolean; onChange?: (s: ChecklistStatus) => void }) {
  const router = useRouter();
  const [current, setCurrent] = useState(status);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const set = (next: ChecklistStatus) => {
    if (next === current) return;
    if (!canTransition(current, next)) return;
    const prev = current;
    setCurrent(next);
    onChange?.(next);
    setError(null);
    startTransition(async () => {
      try {
        await api(`/api/checklist/${itemId}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
        router.refresh();
      } catch (e) {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          queueStatus(itemId, next);
          setError("Saved on this phone. It will sync when you're back online.");
        } else {
          setCurrent(prev);
          onChange?.(prev);
          setError(e instanceof Error ? e.message : "Couldn't save that");
        }
      }
    });
  };

  return (
    <div>
      <div className={cn("grid gap-2", compact ? "grid-cols-4" : "grid-cols-2")} role="group" aria-label="Set status">
        {ACTIONS.map(({ status: s, label, icon: Icon, tone }) => {
          const active = current === s;
          return (
            <button key={s} type="button" aria-pressed={active} disabled={pending && !active} onClick={() => set(s)} className={cn("tap flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-sm font-semibold transition-all", tone, active ? "ring-2 ring-foreground/70 ring-offset-1" : "opacity-80", compact && "flex-col gap-0.5 text-[11px] py-2")}>
              <Icon className={compact ? "h-5 w-5" : "h-4 w-4"} />
              {label}
            </button>
          );
        })}
      </div>
      {error ? <p className="mt-2 text-xs text-warn">{error}</p> : null}
    </div>
  );
}
