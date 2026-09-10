// Pure price-drop and voucher-expiry detection logic. No "server-only" imports here
// on purpose: this module takes plain data in and returns plain data out, so it can
// be unit-tested directly without a store, a provider or a network call.
import type { OfferResult, PriceWatch, ProductSearchResult } from "@/lib/types";
import { daysUntilExpiry } from "@/lib/offers/expiry";
import type { AlertNotification } from "@/lib/notify/types";

export interface TrackedProduct {
  /** The exact listing title we last saw, used for display and as a matching fallback. */
  label: string;
  productId: string | null;
  retailer: string | null;
}

/**
 * Finds the tracked listing among fresh search results. Matching is deliberately
 * conservative - the same provider id first, else the same retailer with the exact
 * same title - so two different listings are never compared and called a "price
 * drop". No confident match => null, and the caller must skip rather than guess.
 */
export function matchTrackedProduct(results: ProductSearchResult[], tracked: TrackedProduct): ProductSearchResult | null {
  if (tracked.productId) {
    const byId = results.find((r) => r.id === tracked.productId);
    if (byId) return byId;
  }
  if (tracked.retailer) {
    const byRetailerAndTitle = results.find((r) => r.retailer === tracked.retailer && r.title.trim().toLowerCase() === tracked.label.trim().toLowerCase());
    if (byRetailerAndTitle) return byRetailerAndTitle;
  }
  return null;
}

export interface PriceChange {
  /** True only when there was a prior recorded price AND the new price is at least `minDrop` lower. */
  isDrop: boolean;
  previousPrice: number | null;
  currentPrice: number;
  saving: number;
}

/**
 * Compares a freshly matched listing against the last price we recorded for it.
 * A first sighting (no prior watch) is never reported as a drop - there is
 * nothing yet to compare against, and claiming one would be a fabricated saving.
 */
export function evaluatePriceChange(matched: Pick<ProductSearchResult, "totalPrice">, lastWatch: PriceWatch | null, minDrop: number): PriceChange {
  const currentPrice = matched.totalPrice;
  if (!lastWatch) return { isDrop: false, previousPrice: null, currentPrice, saving: 0 };
  const saving = Math.round((lastWatch.lastPrice - currentPrice) * 100) / 100;
  return { isDrop: saving >= minDrop, previousPrice: lastWatch.lastPrice, currentPrice, saving };
}

export function priceDropNotification(label: string, retailer: string, change: PriceChange, productUrl: string | null, currency: string): AlertNotification {
  const previous = change.previousPrice ?? change.currentPrice;
  const body = `${retailer} now has "${label}" for ${currency} ${change.currentPrice.toFixed(2)}, down from ${currency} ${previous.toFixed(2)} last checked (save ${currency} ${change.saving.toFixed(2)}).${productUrl ? ` ${productUrl}` : ""}`;
  return {
    kind: "price_drop",
    title: `Price drop: ${label}`,
    body,
    meta: { retailer, previousPrice: change.previousPrice, currentPrice: change.currentPrice, saving: change.saving, productUrl },
  };
}

export function voucherExpiryNotification(offer: OfferResult, now = new Date()): AlertNotification {
  const days = daysUntilExpiry(offer, now);
  const timing = days === 0 ? "ends today" : days === 1 ? "ends tomorrow" : `ends in ${days ?? "an unknown number of"} days`;
  const label = offer.verified ? "Verified voucher" : "Potential offer (unverified)";
  return {
    kind: "voucher_expiry",
    title: `${label} expiring soon: ${offer.retailer}`,
    body: `"${offer.title}" at ${offer.retailer} ${timing}.${offer.code ? ` Code: ${offer.code}.` : ""}`,
    meta: { retailer: offer.retailer, offerId: offer.id, endDate: offer.endDate, verified: offer.verified, code: offer.code },
  };
}
