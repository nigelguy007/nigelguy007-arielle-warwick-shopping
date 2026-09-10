"use client";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronRight, Search } from "lucide-react";
import { Chip, ChipRow } from "@/components/ui/chip";
import { Badge, StampBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { StatusActions } from "./status-actions";
import { STATUS_LABELS, type ChecklistStatus, type ChecklistView } from "@/lib/types";
import { pendingCount, subscribePending } from "@/lib/client/offline-queue";

type Filter = "all" | "essentials" | "buy_before" | "take_from_home" | "wait" | "bought" | "packed" | "needed" | "unpacked";
const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "All" },
  { key: "needed", label: "Still needed" },
  { key: "essentials", label: "Essentials" },
  { key: "buy_before", label: "Buy before Warwick" },
  { key: "take_from_home", label: "Take from home" },
  { key: "wait", label: "Wait" },
  { key: "bought", label: "Bought" },
  { key: "packed", label: "Packed" },
  { key: "unpacked", label: "Not packed" },
];

const STATUS_TONE: Record<ChecklistStatus, "neutral" | "accent" | "success" | "warn"> = { need: "warn", buy: "accent", have: "neutral", bought: "success", packed: "success", wait: "neutral", do_not_buy: "neutral" };

function applyFilter(items: ChecklistView[], f: Filter): ChecklistView[] {
  switch (f) {
    case "essentials": return items.filter((i) => i.priority === "essential");
    case "buy_before": return items.filter((i) => i.timing === "buy_before");
    case "take_from_home": return items.filter((i) => i.timing === "take_from_home");
    case "wait": return items.filter((i) => i.status === "wait" || i.timing === "wait_until_arrival");
    case "bought": return items.filter((i) => i.status === "bought" || i.status === "packed");
    case "packed": return items.filter((i) => i.status === "packed");
    case "needed": return items.filter((i) => i.status === "need" || i.status === "buy");
    case "unpacked": return items.filter((i) => i.status !== "packed" && i.status !== "do_not_buy" && i.status !== "wait");
    default: return items;
  }
}

export function ChecklistClient({ initialItems, supplied }: { initialItems: ChecklistView[]; supplied: string[] }) {
  const params = useSearchParams();
  const [overrides, setOverrides] = useState<Record<string, ChecklistStatus>>({});
  const items = useMemo(() => initialItems.map((i) => (overrides[i.id] ? { ...i, status: overrides[i.id] } : i)), [initialItems, overrides]);
  const [filter, setFilter] = useState<Filter>(() => (FILTERS.some((f) => f.key === params.get("filter")) ? (params.get("filter") as Filter) : "all"));
  const [category, setCategory] = useState<string>("all");
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const pending = useSyncExternalStore(subscribePending, pendingCount, () => 0);

  useEffect(() => {
    try {
      localStorage.setItem("aw:checklist-cache", JSON.stringify(initialItems));
    } catch {
      /* ignore */
    }
  }, [initialItems]);

  const categories = useMemo(() => ["all", ...Array.from(new Set(items.map((i) => i.category)))], [items]);
  const visible = useMemo(() => {
    let list = applyFilter(items, filter);
    if (category !== "all") list = list.filter((i) => i.category === category);
    if (q.trim()) list = list.filter((i) => i.item.toLowerCase().includes(q.trim().toLowerCase()));
    return list;
  }, [items, filter, category, q]);
  const grouped = useMemo(() => {
    const m = new Map<string, ChecklistView[]>();
    for (const i of visible) m.set(i.category, [...(m.get(i.category) ?? []), i]);
    return [...m.entries()];
  }, [visible]);

  return (
    <div>
      <div className="px-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your list" className="pl-9" aria-label="Search checklist" />
        </div>
      </div>
      <div className="px-4 pt-2">
        <ChipRow>
          {FILTERS.map((f) => (
            <Chip key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)}>{f.label}</Chip>
          ))}
        </ChipRow>
        <ChipRow>
          {categories.map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(c)} className="text-xs">{c === "all" ? "All categories" : c}</Chip>
          ))}
        </ChipRow>
      </div>
      {pending > 0 ? <p className="px-4 pt-2 text-xs text-warn">{pending} change{pending === 1 ? "" : "s"} waiting to sync.</p> : null}
      <p className="px-4 pt-2 text-xs text-muted">{visible.length} of {items.length} items</p>
      <div className="space-y-4 px-4 pt-2">
        {grouped.length === 0 ? <p className="card p-4 text-sm text-muted">Nothing matches that.</p> : null}
        {grouped.map(([cat, list]) => (
          <section key={cat}>
            <h2 className="px-1 pb-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">{cat}</h2>
            <ul className="card divide-y divide-border p-0">
              {list.map((item) => {
                const open = expanded === item.id;
                const isSupplied = supplied.includes(item.id);
                return (
                  <li key={item.id} className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button type="button" className="tap min-w-0 flex-1 text-left" onClick={() => setExpanded(open ? null : item.id)} aria-expanded={open}>
                        <p className={`font-medium ${item.status === "packed" || item.status === "do_not_buy" ? "text-muted line-through" : ""}`}>{item.item}{item.qty > 1 ? <span className="text-muted"> × {item.qty}</span> : null}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                          <Badge tone={STATUS_TONE[item.status]}>{STATUS_LABELS[item.status]}</Badge>
                          {item.priority === "essential" ? <StampBadge>Essential</StampBadge> : null}
                          {isSupplied ? <Badge tone="success">Warwick provides</Badge> : null}
                        </div>
                      </button>
                      <Link href={`/checklist/${item.id}`} aria-label={`Open ${item.item}`} className="tap inline-flex items-center justify-center text-muted"><ChevronRight className="h-5 w-5" /></Link>
                    </div>
                    {open ? (
                      <div className="pt-3">
                        {item.notes ? <p className="pb-2 text-xs text-muted">{item.notes}</p> : null}
                        <StatusActions itemId={item.id} status={item.status} compact onChange={(s) => setOverrides((prev) => ({ ...prev, [item.id]: s }))} />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
