import { CHECKLIST_STATUSES, type ChecklistStatus, type ChecklistView } from "@/lib/types";

/**
 * Allowed transitions. The rules are deliberately permissive (Arielle can always
 * correct a mistake) but encode the obvious lifecycle so the UI can offer the
 * right next actions and tests can assert them.
 */
const TRANSITIONS: Record<ChecklistStatus, ChecklistStatus[]> = {
  need: ["have", "buy", "bought", "packed", "wait", "do_not_buy"],
  buy: ["need", "have", "bought", "wait", "do_not_buy"],
  have: ["need", "buy", "packed", "wait", "do_not_buy"],
  bought: ["packed", "need", "buy", "have"],
  packed: ["bought", "have", "need"],
  wait: ["need", "buy", "have", "do_not_buy"],
  do_not_buy: ["need", "buy", "have", "wait"],
};

export function isChecklistStatus(value: unknown): value is ChecklistStatus {
  return typeof value === "string" && (CHECKLIST_STATUSES as readonly string[]).includes(value);
}

export function canTransition(from: ChecklistStatus, to: ChecklistStatus): boolean {
  if (from === to) return true;
  return TRANSITIONS[from].includes(to);
}

export function nextActions(from: ChecklistStatus): ChecklistStatus[] {
  return TRANSITIONS[from];
}

/** Statuses that mean the item is settled and should not be sourced. */
export function isResolved(status: ChecklistStatus): boolean {
  return status === "have" || status === "bought" || status === "packed" || status === "do_not_buy";
}

/** Items Arielle still needs to acquire (excludes waits, owned, bought, packed). */
export function stillNeeded(items: ChecklistView[]): ChecklistView[] {
  return items.filter((i) => i.status === "need" || i.status === "buy");
}

export function notPacked(items: ChecklistView[]): ChecklistView[] {
  return items.filter((i) => i.status !== "packed" && i.status !== "do_not_buy" && i.status !== "wait");
}

export interface ChecklistSummary {
  total: number;
  stillNeeded: number;
  bought: number;
  packed: number;
  essentialsTotal: number;
  essentialsDone: number;
}

export function summarise(items: ChecklistView[]): ChecklistSummary {
  const essentials = items.filter((i) => i.priority === "essential");
  const done = (i: ChecklistView) => i.status === "have" || i.status === "bought" || i.status === "packed";
  return {
    total: items.length,
    stillNeeded: stillNeeded(items).length,
    bought: items.filter((i) => i.status === "bought" || i.status === "packed").length,
    packed: items.filter((i) => i.status === "packed").length,
    essentialsTotal: essentials.length,
    essentialsDone: essentials.filter(done).length,
  };
}

/** Items Arielle actually has in hand (have/bought/packed) - the ones relevant to moving-day packing mode. */
export function packableItems(items: ChecklistView[]): ChecklistView[] {
  return items.filter((i) => i.status === "have" || i.status === "bought" || i.status === "packed");
}

export const UNBOXED = "Unsorted";

export interface PackingGroup {
  box: string;
  items: ChecklistView[];
}

/** Groups packable items by their assigned box label; items with no box yet fall under UNBOXED, sorted last. */
export function groupByBox(items: ChecklistView[]): PackingGroup[] {
  const byBox = new Map<string, ChecklistView[]>();
  for (const i of items) {
    const box = i.box.trim() || UNBOXED;
    byBox.set(box, [...(byBox.get(box) ?? []), i]);
  }
  return [...byBox.entries()]
    .map(([box, boxItems]) => ({ box, items: boxItems }))
    .sort((a, b) => {
      if (a.box === UNBOXED) return 1;
      if (b.box === UNBOXED) return -1;
      return a.box.localeCompare(b.box);
    });
}

export interface PackingProgress {
  total: number;
  packed: number;
}

/** Progress for the moving-day packing screen: how many packable items are already marked packed. */
export function packingProgress(items: ChecklistView[]): PackingProgress {
  return { total: items.length, packed: items.filter((i) => i.status === "packed").length };
}
