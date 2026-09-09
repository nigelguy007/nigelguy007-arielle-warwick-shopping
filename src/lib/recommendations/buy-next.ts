import type { AccommodationProfile, ChecklistView } from "@/lib/types";
import { categoryOfItem, isProhibitedByHall, isSuppliedByHall } from "@/lib/ranking/compatibility";

const PRIORITY_RANK = { essential: 0, recommended: 1, optional: 2 } as const;
const TIMING_RANK = { buy_before: 0, take_from_home: 1, wait_until_arrival: 2, do_not_buy_yet: 3 } as const;

export interface BuyNextCandidate {
  item: ChecklistView;
  estimatedCost: number | null;
  reason: string;
}

/**
 * Orders the items Arielle should buy next. Hard exclusions: anything already
 * owned/bought/packed, anything Warwick supplies or prohibits, and anything the
 * checklist says to wait on or not buy. Then priority, timing, and cost.
 */
export function buyNext(items: ChecklistView[], profile: AccommodationProfile | null, opts: { budgetRemaining?: number | null; limit?: number } = {}): BuyNextCandidate[] {
  const limit = opts.limit ?? 3;
  const candidates: BuyNextCandidate[] = [];
  for (const item of items) {
    if (item.status !== "buy" && item.status !== "need") continue;
    if (item.timing === "take_from_home" && item.status === "need") continue;
    if (item.timing === "do_not_buy_yet" || item.timing === "wait_until_arrival") continue;
    if (isSuppliedByHall(item, profile)) continue;
    if (isProhibitedByHall(item, profile)) continue;
    const kind = categoryOfItem(item);
    if (kind === "furniture" && item.priority !== "essential") continue;
    const cost = item.budgetEstimate === null ? null : item.budgetEstimate * Math.max(1, item.qty);
    let reason = item.priority === "essential" ? "Essential before arrival" : item.priority === "recommended" ? "Recommended" : "Nice to have";
    if (kind === "bedding" && (!profile?.verifiedAt || !profile.bedSize || profile.bedSize === "unknown")) reason += " · bed size not confirmed";
    if (kind === "cookware" && profile?.verifiedAt && profile.hobType === "induction") reason += " · must be induction-compatible";
    candidates.push({ item, estimatedCost: cost, reason });
  }
  candidates.sort((a, b) => {
    const p = PRIORITY_RANK[a.item.priority] - PRIORITY_RANK[b.item.priority];
    if (p !== 0) return p;
    const t = TIMING_RANK[a.item.timing] - TIMING_RANK[b.item.timing];
    if (t !== 0) return t;
    // Bigger-ticket items first within the same priority: they matter most to the budget.
    return (b.estimatedCost ?? -1) - (a.estimatedCost ?? -1);
  });
  const budget = opts.budgetRemaining;
  if (typeof budget === "number") {
    // Prefer items that fit the remaining budget, but keep the order otherwise.
    const fits = candidates.filter((c) => c.estimatedCost === null || c.estimatedCost <= budget);
    const rest = candidates.filter((c) => !fits.includes(c));
    return [...fits, ...rest].slice(0, limit);
  }
  return candidates.slice(0, limit);
}

/** Items the hall provides (only when the profile is verified), for the "Warwick already provides" card. */
export function suppliedItems(items: ChecklistView[], profile: AccommodationProfile | null): ChecklistView[] {
  return items.filter((i) => isSuppliedByHall(i, profile));
}
