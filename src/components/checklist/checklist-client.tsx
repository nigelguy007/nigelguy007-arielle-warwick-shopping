"use client";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Plus } from "lucide-react";
import { Chip, ChipRow } from "@/components/ui/chip";
import { Badge, StampBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Icon, CheckIcon, CATEGORY_ICON_PATH, MISC_ICON_PATH } from "@/components/ui/icons";
import { AddItemSheet } from "./add-item-sheet";
import { BulkActionBar } from "./bulk-action-bar";
import { Toast } from "@/components/ui/toast";
import { useDock } from "@/lib/client/dock-context";
import { api } from "@/lib/client/api";
import { canTransition } from "@/lib/checklist/status";
import { STATUS_LABELS, type ChecklistStatus, type ChecklistView } from "@/lib/types";
import { pendingCount, subscribePending } from "@/lib/client/offline-queue";
import { cn } from "@/lib/utils";

const RESOLVED_STATUSES: ChecklistStatus[] = ["bought", "packed", "do_not_buy", "have"];

type Filter = "all" | "essentials" | "buy_before" | "take_from_home" | "wait" | "bought" | "packed" | "needed" | "unpacked";
const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "All" },
  { key: "needed", label: "Still needed" },
  { key: "essentials", label: "Essentials" },
  { key: "buy_before", label: "Buy before move-in" },
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
  const router = useRouter();
  const params = useSearchParams();
  const { setOverride } = useDock();
  const [overrides, setOverrides] = useState<Record<string, ChecklistStatus>>({});
  const items = useMemo(() => initialItems.map((i) => (overrides[i.id] ? { ...i, status: overrides[i.id] } : i)), [initialItems, overrides]);
  const [filter, setFilter] = useState<Filter>(() => (FILTERS.some((f) => f.key === params.get("filter")) ? (params.get("filter") as Filter) : "all"));
  const [category, setCategory] = useState<string>(() => params.get("category") || "all");
  const [q, setQ] = useState("");
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; undo: () => void } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useSyncExternalStore(subscribePending, pendingCount, () => 0);

  useEffect(() => {
    try {
      localStorage.setItem("aw:checklist-cache", JSON.stringify(initialItems));
    } catch {
      /* ignore */
    }
  }, [initialItems]);

  const showToast = (msg: string, undo: () => void) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, undo });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  const setStatus = async (id: string, next: ChecklistStatus, label: string) => {
    const item = items.find((i) => i.id === id);
    if (!item || !canTransition(item.status, next)) return;
    const prev = item.status;
    setOverrides((o) => ({ ...o, [id]: next }));
    setOpenSwipeId(null);
    try {
      await api(`/api/checklist/${id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
      router.refresh();
      showToast(label, () => {
        setOverrides((o) => ({ ...o, [id]: prev }));
        api(`/api/checklist/${id}`, { method: "PATCH", body: JSON.stringify({ status: prev }) }).then(() => router.refresh());
      });
    } catch {
      setOverrides((o) => ({ ...o, [id]: prev }));
    }
  };

  const bulkApply = async (next: ChecklistStatus, label: string) => {
    const ids = Object.keys(selected).filter((k) => selected[k]);
    if (!ids.length) return;
    const prevMap = new Map(ids.map((id) => [id, items.find((i) => i.id === id)?.status]).filter(([, s]) => s) as [string, ChecklistStatus][]);
    setOverrides((o) => { const n = { ...o }; for (const id of ids) if (prevMap.has(id)) n[id] = next; return n; });
    setSelectMode(false);
    setSelected({});
    await Promise.all(ids.filter((id) => prevMap.has(id)).map((id) => api(`/api/checklist/${id}`, { method: "PATCH", body: JSON.stringify({ status: next }) }).catch(() => undefined)));
    router.refresh();
    showToast(`${ids.length} item${ids.length === 1 ? "" : "s"} marked ${label}`, () => {
      setOverrides((o) => { const n = { ...o }; for (const [id, s] of prevMap) n[id] = s; return n; });
      Promise.all([...prevMap.entries()].map(([id, s]) => api(`/api/checklist/${id}`, { method: "PATCH", body: JSON.stringify({ status: s }) }).catch(() => undefined))).then(() => router.refresh());
    });
  };

  // Multi-select mode replaces the docked tab bar with a bulk-action bar in
  // the same reserved slot - see dock-context.tsx.
  useEffect(() => {
    if (!selectMode) { setOverride(null); return; }
    setOverride(<BulkActionBar onBought={() => bulkApply("bought", "bought")} onPacked={() => bulkApply("packed", "packed")} onSkip={() => bulkApply("do_not_buy", "skipped")} />);
    return () => setOverride(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectMode, selected, items]);

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
  // Sections fully resolved (nothing left to decide) start collapsed so the
  // list doesn't read as one undifferentiated 77-row spreadsheet; anything
  // still needing attention stays open. Computed once from the full initial
  // list (not the filtered `visible`/`grouped`) so it's correct regardless
  // of which filter the URL landed on. Toggling is manual after that.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    const byCategory = new Map<string, ChecklistView[]>();
    for (const i of initialItems) byCategory.set(i.category, [...(byCategory.get(i.category) ?? []), i]);
    const initial = new Set<string>();
    for (const [cat, list] of byCategory) {
      if (list.every((i) => RESOLVED_STATUSES.includes(i.status))) initial.add(cat);
    }
    return initial;
  });
  const toggleCategory = (cat: string) => setCollapsed((prev) => { const next = new Set(prev); if (next.has(cat)) next.delete(cat); else next.add(cat); return next; });

  return (
    <div className="relative">
      <div className="flex items-center justify-between px-4">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your list" className="pl-9" aria-label="Search checklist" />
        </div>
        <button
          type="button"
          onClick={() => { setSelectMode((v) => !v); setSelected({}); }}
          className="ml-3 text-sm font-bold text-accent-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          {selectMode ? "Cancel" : "Select"}
        </button>
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
      <div className="flex items-center justify-between px-4 pt-2">
        <p className="text-xs text-muted">{visible.length} of {items.length} items</p>
        <button type="button" onClick={() => setAddOpen(true)} className="flex items-center gap-1 text-xs font-bold text-accent-ink focus-visible:outline-2 focus-visible:outline-accent">
          <Plus className="h-3.5 w-3.5" /> Add item
        </button>
      </div>
      <div className="space-y-3 px-4 pt-2 pb-4">
        {grouped.length === 0 ? <p className="glass-card p-4 text-sm text-muted">Nothing matches that.</p> : null}
        {grouped.map(([cat, list]) => {
          const iconPath = CATEGORY_ICON_PATH[cat];
          const done = list.filter((i) => RESOLVED_STATUSES.includes(i.status)).length;
          const isCollapsed = collapsed.has(cat);
          return (
            <section key={cat}>
              <button
                type="button"
                onClick={() => toggleCategory(cat)}
                aria-expanded={!isCollapsed}
                className="tap flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left focus-visible:outline-2 focus-visible:outline-accent"
              >
                {iconPath ? <Icon path={iconPath} size={16} className="shrink-0 text-muted" /> : null}
                <h2 className="flex-1 text-sm font-bold">{cat}</h2>
                <span className="tabular text-xs text-muted">{done}/{list.length}</span>
                <Icon path={MISC_ICON_PATH.chevronDown} size={13} sw={2.2} className={cn("shrink-0 text-muted transition-transform", isCollapsed && "-rotate-90")} />
              </button>
              {isCollapsed ? null : (
                <ul className="glass-card divide-y divide-border overflow-hidden p-0">
                  {list.map((item) => {
                    const isSupplied = supplied.includes(item.id);
                    const isSelected = !!selected[item.id];
                    const swipeOpen = openSwipeId === item.id;
                    return (
                      <li key={item.id} className="relative overflow-hidden">
                        {selectMode ? (
                          <button
                            type="button"
                            onClick={() => setSelected((s) => ({ ...s, [item.id]: !s[item.id] }))}
                            className={cn("tap flex w-full items-center gap-3 px-4 py-3 text-left", isSelected && "bg-accent-soft")}
                          >
                            <span className={cn("flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-[1.6px]", isSelected ? "border-accent bg-accent" : "border-muted bg-transparent")}>
                              {isSelected ? <CheckIcon size={11} className="text-on-accent" /> : null}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="text-[15px] font-semibold">{item.item}{item.qty > 1 ? <span className="text-muted"> × {item.qty}</span> : null}</div>
                              <div className="truncate text-xs text-muted">{item.notes || STATUS_LABELS[item.status]}</div>
                            </div>
                          </button>
                        ) : (
                          <>
                            {/* Swipe-reveal actions behind the row - tap the row to toggle,
                                matching the handoff's exact interaction (not a drag gesture,
                                so it's keyboard/tap accessible by construction). */}
                            <div className="absolute inset-0 flex">
                              <button type="button" onClick={() => setStatus(item.id, "bought", `${item.item} marked bought`)} className="flex flex-1 items-center pl-4 text-[13px] font-bold text-white" style={{ background: "var(--success)" }}>
                                Bought
                              </button>
                              <button type="button" onClick={() => setStatus(item.id, "do_not_buy", `${item.item} skipped`)} className="flex w-[76px] items-center justify-center text-[13px] font-bold text-white" style={{ background: "var(--danger)" }}>
                                Skip
                              </button>
                            </div>
                            <div
                              className="relative flex items-center gap-3 px-4 py-3 transition-transform"
                              style={{ background: "var(--background)", transform: swipeOpen ? "translateX(-88px)" : "translateX(0)", transitionDuration: "220ms", transitionTimingFunction: "cubic-bezier(0.25,1,0.5,1)" }}
                            >
                              <button type="button" onClick={() => setOpenSwipeId(swipeOpen ? null : item.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={swipeOpen}>
                                <span className={cn("flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-[1.6px]", RESOLVED_STATUSES.includes(item.status) ? "border-transparent" : "border-muted")} style={RESOLVED_STATUSES.includes(item.status) ? { background: "var(--success)" } : undefined}>
                                  {item.status === "bought" || item.status === "packed" ? <CheckIcon size={11} className="text-white" /> : null}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className={cn("text-[15px] font-semibold", (item.status === "packed" || item.status === "do_not_buy") && "text-muted line-through")}>
                                    {item.item}{item.qty > 1 ? <span className="text-muted"> × {item.qty}</span> : null}
                                  </p>
                                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                                    <Badge tone={STATUS_TONE[item.status]}>{STATUS_LABELS[item.status]}</Badge>
                                    {item.priority === "essential" ? <StampBadge>Essential</StampBadge> : null}
                                    {isSupplied ? <Badge tone="success">Warwick provides</Badge> : null}
                                    {item.custom ? <Badge tone="neutral">Your item</Badge> : null}
                                  </div>
                                </div>
                              </button>
                              <Link href={`/checklist/${item.id}`} aria-label={`Open ${item.item}`} className="tap inline-flex shrink-0 items-center justify-center text-muted">
                                <Icon path={MISC_ICON_PATH.chevronRight} size={18} />
                              </Link>
                            </div>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      <AddItemSheet open={addOpen} onClose={() => setAddOpen(false)} categories={categories.filter((c) => c !== "all")} onCreated={() => router.refresh()} />
      {toast ? <Toast message={toast.msg} onUndo={toast.undo} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}
