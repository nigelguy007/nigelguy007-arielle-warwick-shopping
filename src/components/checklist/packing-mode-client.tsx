"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PackageCheck, Package } from "lucide-react";
import { api } from "@/lib/client/api";
import { Input } from "@/components/ui/input";
import { groupByBox, packingProgress, UNBOXED } from "@/lib/checklist/status";
import type { ChecklistStatus, ChecklistView } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Focused moving-day view: large "packed" toggles grouped by box, reusing the
 * same checklist status/box fields as the main list (no parallel data model).
 */
export function PackingModeClient({ initialItems }: { initialItems: ChecklistView[] }) {
  const router = useRouter();
  const [statusOverrides, setStatusOverrides] = useState<Record<string, ChecklistStatus>>({});
  const [boxOverrides, setBoxOverrides] = useState<Record<string, string>>({});
  // Remembers the status an item had just before it was marked packed, so untoggling restores it
  // instead of guessing "bought" for something that was only ever "have".
  const [beforePacked, setBeforePacked] = useState<Record<string, ChecklistStatus>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const items = useMemo(
    () => initialItems.map((i) => ({ ...i, status: statusOverrides[i.id] ?? i.status, box: boxOverrides[i.id] ?? i.box })),
    [initialItems, statusOverrides, boxOverrides],
  );
  const progress = packingProgress(items);
  const groups = useMemo(() => groupByBox(items), [items]);

  const togglePacked = async (item: ChecklistView) => {
    const next: ChecklistStatus = item.status === "packed" ? (beforePacked[item.id] ?? "bought") : "packed";
    setBusy(item.id);
    setError(null);
    setStatusOverrides((prev) => ({ ...prev, [item.id]: next }));
    if (next === "packed") setBeforePacked((prev) => ({ ...prev, [item.id]: item.status }));
    try {
      await api(`/api/checklist/${item.id}`, { method: "PATCH", body: JSON.stringify({ status: next, box: item.box }) });
      router.refresh();
    } catch (e) {
      setStatusOverrides((prev) => ({ ...prev, [item.id]: item.status }));
      setError(e instanceof Error ? e.message : "Couldn't save that");
    } finally {
      setBusy(null);
    }
  };

  const saveBox = async (item: ChecklistView, box: string) => {
    if (box === item.box) return;
    setBoxOverrides((prev) => ({ ...prev, [item.id]: box }));
    try {
      await api(`/api/checklist/${item.id}`, { method: "PATCH", body: JSON.stringify({ status: item.status, box }) });
      router.refresh();
    } catch (e) {
      setBoxOverrides((prev) => ({ ...prev, [item.id]: item.box }));
      setError(e instanceof Error ? e.message : "Couldn't save that");
    }
  };

  return (
    <div className="px-4">
      <div className="card mb-4 p-4">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>Packed</span>
          <span>{progress.packed} / {progress.total}</span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-black/5">
          <div className="h-full rounded-full bg-success transition-all" style={{ width: `${progress.total ? Math.round((progress.packed / progress.total) * 100) : 0}%` }} />
        </div>
      </div>

      {error ? <p className="mb-3 text-sm text-warn">{error}</p> : null}

      {items.length === 0 ? (
        <div className="card p-6 text-center text-sm text-muted">
          Nothing to pack yet. Once you&apos;ve marked items &ldquo;Have it&rdquo; or &ldquo;Bought&rdquo; on your checklist, they&apos;ll show up here.
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => {
            const groupPacked = group.items.filter((i) => i.status === "packed").length;
            return (
              <section key={group.box}>
                <h2 className="flex items-center gap-1.5 px-1 pb-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                  <Package className="h-3.5 w-3.5" /> {group.box} · {groupPacked}/{group.items.length}
                </h2>
                <ul className="space-y-2">
                  {group.items.map((item) => (
                    <li key={item.id} className="card flex items-center gap-3 p-3">
                      <button
                        type="button"
                        aria-pressed={item.status === "packed"}
                        disabled={busy === item.id}
                        onClick={() => togglePacked(item)}
                        className={cn(
                          "tap flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-colors",
                          item.status === "packed" ? "bg-success text-white" : "bg-black/5 text-muted",
                        )}
                        aria-label={item.status === "packed" ? `Mark ${item.item} not packed` : `Mark ${item.item} packed`}
                      >
                        <PackageCheck className="h-7 w-7" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={cn("font-medium", item.status === "packed" && "text-muted line-through")}>
                          {item.item}
                          {item.qty > 1 ? <span className="text-muted"> × {item.qty}</span> : null}
                        </p>
                        <Input
                          defaultValue={item.box}
                          key={item.box}
                          placeholder={UNBOXED}
                          aria-label={`Which box is ${item.item} in`}
                          className="mt-1 h-9 px-3 text-sm"
                          onBlur={(e) => saveBox(item, e.target.value.trim())}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
