import "server-only";
import { tool } from "ai";
import { z } from "zod";
import { getStore } from "@/lib/store";
import { loadDashboard, findItemByName } from "@/lib/services/dashboard";
import { compareProducts } from "@/lib/services/compare";
import { nearbyStores } from "@/lib/providers/map";
import { searchOffers } from "@/lib/providers/offer";
import { calculateBasket, fitToBudget, formatGBP } from "@/lib/budget/math";
import { canTransition, notPacked, stillNeeded } from "@/lib/checklist/status";
import { ageLabel } from "@/lib/cache";
import { CHECKLIST_STATUSES, WARWICK_CAMPUS, type LocationContext, type ProductSearchResult } from "@/lib/types";
import type { StoreCategory } from "@/lib/providers/map/types";
import type { ScoredProduct } from "@/lib/ranking/value-score";

function compact(p: ProductSearchResult) {
  return { id: p.id, retailer: p.retailer, title: p.title, price: p.currentPrice, delivery: p.deliveryPrice ?? null, total: p.totalPrice, rating: p.rating ?? null, availability: p.availability, url: p.productUrl, source: p.provider === "mock" ? "mock (not live)" : `${p.provider} (${p.sourceConfidence})`, checked: ageLabel(p.checkedAt) };
}
function compactScored(s: ScoredProduct | null) {
  if (!s) return null;
  return { ...compact(s.product), score: Math.round(s.score * 100) / 100, warnings: s.warnings, reasons: s.reasons, nearbyStore: s.nearbyStore ? { name: s.nearbyStore.name, distanceKm: s.nearbyStore.distanceMeters ? Math.round(s.nearbyStore.distanceMeters / 100) / 10 : null, note: "store exists nearby; stock not confirmed" } : null, verifiedOffer: s.verifiedOffer ? { title: s.verifiedOffer.title, code: s.verifiedOffer.code, ends: s.verifiedOffer.endDate } : null };
}

export function buildAgentTools(userId: string, location: LocationContext | null) {
  const loc = location ?? WARWICK_CAMPUS;
  return {
    getChecklist: tool({
      description: "Full checklist with the user's status for each item, plus summary counts.",
      inputSchema: z.object({ status: z.enum(CHECKLIST_STATUSES).optional().describe("Filter by status"), category: z.string().optional() }),
      execute: async ({ status, category }) => {
        const d = await loadDashboard(userId);
        const items = d.items.filter((i) => (!status || i.status === status) && (!category || i.category.toLowerCase() === category.toLowerCase()));
        return { summary: d.summary, items: items.map((i) => ({ id: i.id, item: i.item, category: i.category, priority: i.priority, timing: i.timing, status: i.status, qty: i.qty, estimate: i.budgetEstimate })) };
      },
    }),
    getChecklistItem: tool({
      description: "Look up one checklist item by id or name.",
      inputSchema: z.object({ idOrName: z.string() }),
      execute: async ({ idOrName }) => {
        const d = await loadDashboard(userId);
        const item = d.items.find((i) => i.id === idOrName) ?? findItemByName(d.items, idOrName);
        return item ? { ...item, suppliedByWarwick: d.supplied.some((s) => s.id === item.id) } : { error: "Item not found" };
      },
    }),
    updateChecklistStatus: tool({
      description: "Set an item's status (have, buy, bought, packed, need, wait, do_not_buy). Use for 'mark X as bought/packed'.",
      inputSchema: z.object({ idOrName: z.string(), status: z.enum(CHECKLIST_STATUSES), paidPrice: z.number().optional().describe("If bought, what was paid in pounds") }),
      execute: async ({ idOrName, status, paidPrice }) => {
        const store = await getStore();
        const d = await loadDashboard(userId);
        const item = d.items.find((i) => i.id === idOrName) ?? findItemByName(d.items, idOrName);
        if (!item) return { error: "Item not found" };
        if (!canTransition(item.status, status)) return { error: `Can't move ${item.item} from ${item.status} to ${status}` };
        await store.setChecklistStatus(userId, item.id, status);
        if (status === "bought" && typeof paidPrice === "number") await store.addPurchase(userId, { checklistItemId: item.id, productSnapshot: null, retailer: "", paidPrice, voucherUsed: null });
        return { ok: true, item: item.item, from: item.status, to: status };
      },
    }),
    getAccommodationProfile: tool({
      description: "The user's Warwick accommodation and its verified constraints (bed size, hob type, supplied appliances, prohibited items). Fields are null when not verified.",
      inputSchema: z.object({}),
      execute: async () => {
        const d = await loadDashboard(userId);
        if (!d.accommodation) return { error: "Tell me your Warwick accommodation before I recommend bedding." };
        return { ...d.accommodation, verified: Boolean(d.accommodation.verifiedAt), suppliedChecklistItems: d.supplied.map((s) => s.item) };
      },
    }),
    searchProducts: tool({
      description: "Search current UK product listings for a checklist item or free-text query. Applies accommodation compatibility rules.",
      inputSchema: z.object({ query: z.string().optional(), itemIdOrName: z.string().optional(), maxPrice: z.number().optional(), onlineOnly: z.boolean().optional() }),
      execute: async ({ query, itemIdOrName, maxPrice, onlineOnly }) => {
        const d = await loadDashboard(userId);
        const item = itemIdOrName ? (d.items.find((i) => i.id === itemIdOrName) ?? findItemByName(d.items, itemIdOrName)) : null;
        const cmp = await compareProducts(userId, { query, itemId: item?.id, location: loc, maxPrice, onlineOnly });
        return { query: cmp.query, warning: cmp.warning, error: cmp.error, provider: cmp.mock ? "mock (not live)" : cmp.provider, checked: ageLabel(cmp.checkedAt), results: cmp.recommendations.all.slice(0, 6).map(compactScored), excluded: cmp.recommendations.excluded.map((e) => ({ title: e.product.title, retailer: e.product.retailer, reason: e.reason })) };
      },
    }),
    compareProducts: tool({
      description: "Cheapest / best value / nearby picks for an item.",
      inputSchema: z.object({ query: z.string().optional(), itemIdOrName: z.string().optional() }),
      execute: async ({ query, itemIdOrName }) => {
        const d = await loadDashboard(userId);
        const item = itemIdOrName ? (d.items.find((i) => i.id === itemIdOrName) ?? findItemByName(d.items, itemIdOrName)) : null;
        const cmp = await compareProducts(userId, { query, itemId: item?.id, location: loc });
        return { warning: cmp.warning, error: cmp.error, provider: cmp.mock ? "mock (not live)" : cmp.provider, checked: ageLabel(cmp.checkedAt), cheapest: compactScored(cmp.recommendations.cheapest), bestValue: compactScored(cmp.recommendations.bestValue), nearby: compactScored(cmp.recommendations.nearby), excluded: cmp.recommendations.excluded.map((e) => ({ title: e.product.title, reason: e.reason })) };
      },
    }),
    searchNearbyStores: tool({
      description: "Physical shops near the user's location (or Warwick campus). Existence and opening hours only - never stock.",
      inputSchema: z.object({ retailer: z.string().optional(), category: z.enum(["supermarket", "pharmacy", "home_goods", "department_store", "electronics", "clothing", "shopping_centre"]).optional() }),
      execute: async ({ retailer, category }) => {
        if (!loc.coords) return { error: "Share your location or enter a postcode to see nearby shops." };
        const res = await nearbyStores({ center: loc.coords, retailer, categories: category ? [category as StoreCategory] : undefined, limit: 8 });
        return { from: loc.label, provider: res.mock ? "mock (not live)" : res.provider, checked: ageLabel(res.checkedAt), note: "Store existence only. Stock is not confirmed.", stores: res.stores.map((s) => ({ name: s.name, address: s.address, distanceKm: s.distanceMeters ? Math.round(s.distanceMeters / 100) / 10 : null, openNow: s.openNow, rating: s.rating, mapsUrl: s.googleMapsUrl })) };
      },
    }),
    searchOffers: tool({
      description: "Vouchers, promotions and student-discount links for a retailer. Only 'verified: true' offers can reduce a price.",
      inputSchema: z.object({ retailer: z.string() }),
      execute: async ({ retailer }) => {
        const res = await searchOffers({ retailer });
        return { provider: res.mock ? "mock (not live)" : res.provider, checked: ageLabel(res.checkedAt), offers: res.offers.map((o) => ({ title: o.title, retailer: o.retailer, type: o.type, code: o.code, percentage: o.percentage, amount: o.amount, minSpend: o.minSpend, ends: o.endDate, terms: o.terms, source: o.source, url: o.sourceUrl, verified: o.verified, studentVerificationRequired: o.studentVerificationRequired })), message: res.offers.some((o) => o.verified) ? null : "I couldn't verify a current discount for this item." };
      },
    }),
    getBudget: tool({
      description: "Budget, spent, committed basket and remaining.",
      inputSchema: z.object({}),
      execute: async () => {
        const d = await loadDashboard(userId);
        return { ...d.budgetSummary, potentialSavings: d.basketTotals.potentialSavings, confirmedSavings: d.basketTotals.confirmedSavings, purchases: d.purchases.slice(0, 10).map((p) => ({ retailer: p.retailer, paid: p.paidPrice, when: p.purchasedAt })) };
      },
    }),
    calculateBasket: tool({
      description: "Current basket grouped by retailer with estimated total.",
      inputSchema: z.object({}),
      execute: async () => {
        const d = await loadDashboard(userId);
        return { shops: d.basketTotals.retailerCount, estimatedTotal: d.basketTotals.estimatedTotal, confirmedSavings: d.basketTotals.confirmedSavings, potentialSavings: d.basketTotals.potentialSavings, byRetailer: d.basketTotals.byRetailer.map((g) => ({ retailer: g.retailer, total: g.total, items: g.items.map((i) => ({ basketItemId: i.id, title: i.productSnapshot.title, qty: i.quantity, price: i.productSnapshot.currentPrice })) })) };
      },
    }),
    addToBasket: tool({
      description: "Add a product (by product id from a search result) to the basket.",
      inputSchema: z.object({ productId: z.string(), query: z.string().describe("The search query that produced the product"), itemIdOrName: z.string().optional(), quantity: z.number().int().min(1).max(10).default(1) }),
      execute: async ({ productId, query, itemIdOrName, quantity }) => {
        const d = await loadDashboard(userId);
        const item = itemIdOrName ? (d.items.find((i) => i.id === itemIdOrName) ?? findItemByName(d.items, itemIdOrName)) : null;
        const cmp = await compareProducts(userId, { query, itemId: item?.id, location: loc });
        const product = cmp.results.find((p) => p.id === productId);
        if (!product) return { error: "Product not found in the latest results - search again first." };
        const store = await getStore();
        const line = await store.addToBasket(userId, product, quantity, item?.id ?? null);
        return { ok: true, basketItemId: line.id, title: product.title, total: product.totalPrice * quantity };
      },
    }),
    removeFromBasket: tool({
      description: "Remove a basket line by basketItemId.",
      inputSchema: z.object({ basketItemId: z.string() }),
      execute: async ({ basketItemId }) => {
        const store = await getStore();
        await store.removeFromBasket(userId, basketItemId);
        return { ok: true };
      },
    }),
    markPurchased: tool({
      description: "Record a purchase against a checklist item and mark it bought.",
      inputSchema: z.object({ itemIdOrName: z.string(), paidPrice: z.number().min(0), retailer: z.string().optional() }),
      execute: async ({ itemIdOrName, paidPrice, retailer }) => {
        const d = await loadDashboard(userId);
        const item = d.items.find((i) => i.id === itemIdOrName) ?? findItemByName(d.items, itemIdOrName);
        if (!item) return { error: "Item not found" };
        const store = await getStore();
        await store.addPurchase(userId, { checklistItemId: item.id, productSnapshot: null, retailer: retailer ?? "", paidPrice, voucherUsed: null });
        await store.setChecklistStatus(userId, item.id, "bought");
        const after = await loadDashboard(userId);
        return { ok: true, item: item.item, remaining: after.budgetSummary.remaining };
      },
    }),
    getRemainingItems: tool({
      description: "Items still needed, or not yet packed, ranked by priority. Optionally fit them into a budget in pounds.",
      inputSchema: z.object({ view: z.enum(["still_needed", "not_packed", "buy_next"]).default("still_needed"), budget: z.number().optional() }),
      execute: async ({ view, budget }) => {
        const d = await loadDashboard(userId);
        if (view === "not_packed") return { items: notPacked(d.items).map((i) => ({ item: i.item, status: i.status })) };
        if (view === "buy_next") return { items: d.buyNext.map((b) => ({ item: b.item.item, estimate: b.estimatedCost, reason: b.reason })) };
        const ordered = stillNeeded(d.items).filter((i) => i.timing === "buy_before").sort((a, b) => ["essential", "recommended", "optional"].indexOf(a.priority) - ["essential", "recommended", "optional"].indexOf(b.priority));
        const withPrice = ordered.map((i) => ({ item: i.item, priority: i.priority, price: (i.budgetEstimate ?? 0) * i.qty, estimateOnly: true }));
        if (typeof budget === "number") {
          const { chosen, total } = fitToBudget(withPrice, budget);
          return { budget, chosen, total: formatGBP(total), note: "Estimates from the checklist, not live prices. Use searchProducts for current prices." };
        }
        return { items: withPrice };
      },
    }),
  };
}

export type AgentTools = ReturnType<typeof buildAgentTools>;

export const _internal = { calculateBasket };
