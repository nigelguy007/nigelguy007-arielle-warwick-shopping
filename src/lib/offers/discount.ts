import type { OfferResult } from "@/lib/types";
import { isOfferActive } from "@/lib/offers/expiry";
import { round2 } from "@/lib/budget/math";

export function retailerKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .replace(/(uk|ltd|plc|co)$/g, "");
}

export function offerMatchesRetailer(offer: OfferResult, retailer: string): boolean {
  const a = retailerKey(offer.retailer);
  const b = retailerKey(retailer);
  return a === b || a.includes(b) || b.includes(a);
}

export function applyOffer(price: number, offer: OfferResult): { price: number; saving: number } {
  if (offer.minSpend !== null && price < offer.minSpend) return { price: round2(price), saving: 0 };
  let saving = 0;
  if (offer.percentage !== null) saving = price * (offer.percentage / 100);
  else if (offer.amount !== null) saving = offer.amount;
  saving = Math.min(price, Math.max(0, saving));
  return { price: round2(price - saving), saving: round2(saving) };
}

/**
 * Best offer for a retailer/spend, considering only offers that are in date.
 * Verified offers always beat unverified ones regardless of value, because an
 * unverified saving must never reduce a total.
 */
export function bestApplicableOffer(
  offers: OfferResult[],
  retailer: string,
  spend: number,
  now = new Date(),
): OfferResult | null {
  const candidates = offers.filter((o) => offerMatchesRetailer(o, retailer) && isOfferActive(o, now));
  let best: OfferResult | null = null;
  let bestSaving = 0;
  for (const o of candidates) {
    const { saving } = applyOffer(spend, o);
    if (saving <= 0) continue;
    if (best === null) {
      best = o;
      bestSaving = saving;
      continue;
    }
    if (o.verified && !best.verified) {
      best = o;
      bestSaving = saving;
    } else if (o.verified === best.verified && saving > bestSaving) {
      best = o;
      bestSaving = saving;
    }
  }
  return best;
}

export interface PriceWithOffer {
  listed: number;
  estimatedAfterVerified: number;
  verifiedOffer: OfferResult | null;
  unverifiedOffer: OfferResult | null;
}

/** Listed price plus an estimate after a verified voucher only. Unverified offers are surfaced but never applied. */
export function priceWithOffers(price: number, retailer: string, offers: OfferResult[], now = new Date()): PriceWithOffer {
  const active = offers.filter((o) => offerMatchesRetailer(o, retailer) && isOfferActive(o, now));
  const verified = bestApplicableOffer(active.filter((o) => o.verified), retailer, price, now);
  const unverified = bestApplicableOffer(active.filter((o) => !o.verified), retailer, price, now);
  return {
    listed: round2(price),
    estimatedAfterVerified: verified ? applyOffer(price, verified).price : round2(price),
    verifiedOffer: verified,
    unverifiedOffer: unverified,
  };
}
