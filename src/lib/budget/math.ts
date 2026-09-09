import type { BasketItem, Budget, OfferResult, Purchase } from "@/lib/types";
import { applyOffer, bestApplicableOffer } from "@/lib/offers/discount";

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function formatGBP(n: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);
}

export function lineTotal(item: Pick<BasketItem, "productSnapshot" | "quantity">): number {
  const unit = item.productSnapshot.currentPrice;
  const delivery = item.productSnapshot.deliveryPrice ?? 0;
  return round2(unit * item.quantity + delivery);
}

export interface BasketTotals {
  itemCount: number;
  retailerCount: number;
  subtotal: number;
  delivery: number;
  /** Savings from offers that are verified and in date. */
  confirmedSavings: number;
  /** Savings from offers that could apply but are not verified. Never subtracted from the total. */
  potentialSavings: number;
  estimatedTotal: number;
  byRetailer: Array<{ retailer: string; items: BasketItem[]; subtotal: number; delivery: number; total: number }>;
}

export function calculateBasket(items: BasketItem[], offers: OfferResult[] = [], now = new Date()): BasketTotals {
  const groups = new Map<string, BasketItem[]>();
  for (const item of items) {
    const key = item.productSnapshot.retailer;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  let subtotal = 0;
  let delivery = 0;
  let confirmedSavings = 0;
  let potentialSavings = 0;
  const byRetailer: BasketTotals["byRetailer"] = [];
  for (const [retailer, group] of groups) {
    const groupSubtotal = round2(group.reduce((s, i) => s + i.productSnapshot.currentPrice * i.quantity, 0));
    // Delivery counted once per retailer (the max quoted), matching a real single-checkout.
    const groupDelivery = round2(Math.max(0, ...group.map((i) => i.productSnapshot.deliveryPrice ?? 0)));
    const offer = bestApplicableOffer(offers, retailer, groupSubtotal, now);
    let groupDiscount = 0;
    if (offer) {
      const applied = applyOffer(groupSubtotal, offer);
      if (offer.verified) {
        confirmedSavings += applied.saving;
        groupDiscount = applied.saving;
      } else {
        potentialSavings += applied.saving;
      }
    }
    subtotal += groupSubtotal;
    delivery += groupDelivery;
    byRetailer.push({
      retailer,
      items: group,
      subtotal: groupSubtotal,
      delivery: groupDelivery,
      total: round2(groupSubtotal + groupDelivery - groupDiscount),
    });
  }
  return {
    itemCount: items.reduce((n, i) => n + i.quantity, 0),
    retailerCount: groups.size,
    subtotal: round2(subtotal),
    delivery: round2(delivery),
    confirmedSavings: round2(confirmedSavings),
    potentialSavings: round2(potentialSavings),
    estimatedTotal: round2(subtotal + delivery - confirmedSavings),
    byRetailer,
  };
}

export interface BudgetSummary {
  budget: number | null;
  spent: number;
  committed: number;
  remaining: number | null;
  remainingAfterBasket: number | null;
}

export function summariseBudget(budget: Budget | null, purchases: Purchase[], basketTotals: BasketTotals): BudgetSummary {
  const spent = round2(purchases.reduce((s, p) => s + p.paidPrice, 0));
  const committed = basketTotals.estimatedTotal;
  const amount = budget?.amount ?? null;
  return {
    budget: amount,
    spent,
    committed,
    remaining: amount === null ? null : round2(amount - spent),
    remainingAfterBasket: amount === null ? null : round2(amount - spent - committed),
  };
}

/**
 * Greedy "what should I buy next with £X" selection: items are already ordered by
 * priority; take each while it fits. Returns the chosen subset and the total.
 */
export function fitToBudget<T extends { price: number }>(ordered: T[], limit: number): { chosen: T[]; total: number } {
  const chosen: T[] = [];
  let total = 0;
  for (const c of ordered) {
    if (total + c.price <= limit + 1e-9) {
      chosen.push(c);
      total = round2(total + c.price);
    }
  }
  return { chosen, total };
}
