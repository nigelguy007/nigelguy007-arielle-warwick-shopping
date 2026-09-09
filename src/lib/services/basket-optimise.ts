import type { BasketItem, OfferResult, ProductSearchResult, StoreResult } from "@/lib/types";
import { calculateBasket, round2 } from "@/lib/budget/math";
import { retailerKey } from "@/lib/offers/discount";

export type OptimiseMode = "cheapest" | "best_value" | "one_shop" | "local_today" | "online_only" | "student_deals";

export const OPTIMISE_LABELS: Record<OptimiseMode, string> = {
  cheapest: "Cheapest",
  best_value: "Best value",
  one_shop: "One shop",
  local_today: "Local today",
  online_only: "Online only",
  student_deals: "Student deals",
};

export interface Alternative {
  basketItemId: string;
  candidates: Array<{ product: ProductSearchResult; score: number }>;
}

export interface OptimisedBasket {
  mode: OptimiseMode;
  items: BasketItem[];
  totals: ReturnType<typeof calculateBasket>;
  note: string;
}

/**
 * Re-selects a product for each basket line from its alternatives according to the
 * chosen mode. Pure and deterministic so it can be unit tested. Alternatives come from
 * the ranking layer (already compatibility-filtered).
 */
export function optimiseBasket(basket: BasketItem[], alternatives: Alternative[], mode: OptimiseMode, ctx: { offers: OfferResult[]; stores: StoreResult[]; now?: Date }): OptimisedBasket {
  const now = ctx.now ?? new Date();
  const altMap = new Map(alternatives.map((a) => [a.basketItemId, a.candidates]));
  const openStoreRetailers = new Set(ctx.stores.filter((s) => s.openNow !== false).map((s) => retailerKey(s.retailerKey ?? s.name)));
  const verifiedOfferRetailers = new Set(ctx.offers.filter((o) => o.verified && (!o.endDate || Date.parse(o.endDate) >= now.getTime())).map((o) => retailerKey(o.retailer)));

  const choose = (line: BasketItem, pick: (cands: Array<{ product: ProductSearchResult; score: number }>) => ProductSearchResult | null): BasketItem => {
    const cands = altMap.get(line.id);
    if (!cands || cands.length === 0) return line;
    const chosen = pick(cands);
    return chosen ? { ...line, productSnapshot: chosen } : line;
  };

  let items: BasketItem[];
  let note: string;
  switch (mode) {
    case "cheapest":
      items = basket.map((l) => choose(l, (c) => [...c].sort((a, b) => a.product.totalPrice - b.product.totalPrice)[0].product));
      note = "Lowest total price for every line, ignoring convenience.";
      break;
    case "best_value":
      items = basket.map((l) => choose(l, (c) => [...c].sort((a, b) => b.score - a.score)[0].product));
      note = "Best overall value score per line.";
      break;
    case "online_only":
      items = basket.map((l) => choose(l, (c) => [...c].filter((x) => !x.product.availability.toLowerCase().includes("store")).sort((a, b) => b.score - a.score)[0]?.product ?? [...c].sort((a, b) => b.score - a.score)[0].product));
      note = "Physical-store proximity ignored.";
      break;
    case "local_today":
      items = basket.map((l) => choose(l, (c) => [...c].filter((x) => openStoreRetailers.has(retailerKey(x.product.retailer))).sort((a, b) => b.score - a.score)[0]?.product ?? null));
      note = "Prefers retailers with a nearby store that is open. Store stock is not confirmed.";
      break;
    case "student_deals":
      items = basket.map((l) => choose(l, (c) => [...c].filter((x) => verifiedOfferRetailers.has(retailerKey(x.product.retailer))).sort((a, b) => b.score - a.score)[0]?.product ?? [...c].sort((a, b) => b.score - a.score)[0].product));
      note = "Prefers retailers with a verified, in-date offer. Unverified student codes are never applied.";
      break;
    case "one_shop": {
      // Try each retailer that can cover the most lines; pick the one with the lowest total.
      const retailerCoverage = new Map<string, number>();
      for (const line of basket) {
        const cands = altMap.get(line.id) ?? [{ product: line.productSnapshot, score: 0 }];
        for (const r of new Set(cands.map((c) => c.product.retailer))) retailerCoverage.set(r, (retailerCoverage.get(r) ?? 0) + 1);
      }
      const maxCover = Math.max(0, ...retailerCoverage.values());
      const best = [...retailerCoverage.entries()].filter(([, n]) => n === maxCover).map(([r]) => r);
      let bestItems = basket;
      let bestTotal = Infinity;
      for (const r of best) {
        const trial = basket.map((l) => choose(l, (c) => c.filter((x) => x.product.retailer === r).sort((a, b) => a.product.totalPrice - b.product.totalPrice)[0]?.product ?? [...c].sort((a, b) => b.score - a.score)[0].product));
        const total = calculateBasket(trial, ctx.offers, now).estimatedTotal;
        if (total < bestTotal) {
          bestTotal = total;
          bestItems = trial;
        }
      }
      items = bestItems;
      const shops = new Set(items.map((i) => i.productSnapshot.retailer)).size;
      note = shops === 1 ? "Everything from one shop." : `Fewest shops possible: ${shops}. Some items are only sold elsewhere.`;
      break;
    }
  }
  const totals = calculateBasket(items, ctx.offers, now);
  return { mode, items, totals: { ...totals, estimatedTotal: round2(totals.estimatedTotal) }, note };
}
