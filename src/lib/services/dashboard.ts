import "server-only";
import { getStore } from "@/lib/store";
import { summarise } from "@/lib/checklist/status";
import { calculateBasket, summariseBudget } from "@/lib/budget/math";
import { buyNext, suppliedItems } from "@/lib/recommendations/buy-next";
import { searchOffers } from "@/lib/providers/offer";
import { isNearingExpiry } from "@/lib/offers/expiry";
import { env } from "@/lib/env";
import type { AccommodationProfile, ChecklistView, OfferResult } from "@/lib/types";

export async function loadDashboard(userId: string) {
  const store = await getStore();
  const [profile, items, budget, purchases, basket] = await Promise.all([
    store.getProfile(userId),
    store.listUserChecklist(userId),
    store.getBudget(userId),
    store.listPurchases(userId),
    store.listBasket(userId),
  ]);
  const accommodation: AccommodationProfile | null = profile?.accommodationSlug ? await store.getAccommodation(profile.accommodationSlug) : null;
  let offers: OfferResult[] = [];
  if (basket.length > 0) {
    const retailers = [...new Set(basket.map((b) => b.productSnapshot.retailer))];
    const found = await Promise.all(retailers.map((r) => searchOffers({ retailer: r })));
    offers = found.flatMap((f) => f.offers);
  }
  const basketTotals = calculateBasket(basket, offers);
  const budgetSummary = summariseBudget(budget, purchases, basketTotals);
  const summary = summarise(items);
  const next = buyNext(items, accommodation, { budgetRemaining: budgetSummary.remaining, limit: 3 });
  // Real, cheap-to-compute signal only - no live price re-check on every Home
  // load (that's what the /api/alerts/run cron sweep is for). Price-drop
  // counts intentionally aren't shown here for the same reason.
  const voucherExpiringCount = offers.filter((o) => isNearingExpiry(o, env.voucherExpiryAlertDays)).length;
  return {
    profile,
    accommodation,
    items,
    summary,
    budget,
    budgetSummary,
    basket,
    basketTotals,
    purchases,
    buyNext: next,
    supplied: suppliedItems(items, accommodation),
    voucherExpiringCount,
  };
}

export type Dashboard = Awaited<ReturnType<typeof loadDashboard>>;

export function findItemByName(items: ChecklistView[], name: string): ChecklistView | null {
  const q = name.trim().toLowerCase();
  if (!q) return null;
  const exact = items.find((i) => i.item.toLowerCase() === q);
  if (exact) return exact;
  const starts = items.find((i) => i.item.toLowerCase().startsWith(q));
  if (starts) return starts;
  const tokens = q.split(/\s+/);
  return items.find((i) => tokens.every((t) => i.item.toLowerCase().includes(t))) ?? items.find((i) => i.item.toLowerCase().includes(q)) ?? null;
}
