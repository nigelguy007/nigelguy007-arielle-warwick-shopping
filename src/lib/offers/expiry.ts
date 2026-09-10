import type { OfferResult } from "@/lib/types";

/** True when the offer has started and not yet ended. Missing dates are treated as open-ended. */
export function isOfferActive(offer: Pick<OfferResult, "startDate" | "endDate">, now = new Date()): boolean {
  const t = now.getTime();
  if (offer.startDate) {
    const start = Date.parse(offer.startDate);
    if (Number.isFinite(start) && start > t) return false;
  }
  if (offer.endDate) {
    const end = Date.parse(offer.endDate);
    if (Number.isFinite(end) && end < t) return false;
  }
  return true;
}

export function filterActiveOffers<T extends Pick<OfferResult, "startDate" | "endDate">>(offers: T[], now = new Date()): T[] {
  return offers.filter((o) => isOfferActive(o, now));
}

export function describeExpiry(offer: Pick<OfferResult, "endDate">, now = new Date()): string {
  if (!offer.endDate) return "No end date listed";
  const end = Date.parse(offer.endDate);
  if (!Number.isFinite(end)) return "Expiry unknown";
  const days = Math.ceil((end - now.getTime()) / 86_400_000);
  if (days < 0) return "Expired";
  if (days === 0) return "Ends today";
  if (days === 1) return "Ends tomorrow";
  return `Ends in ${days} days`;
}

/** Whole days from `now` until `endDate`. Null when there's no end date or it can't be parsed - never guess a countdown. */
export function daysUntilExpiry(offer: Pick<OfferResult, "endDate">, now = new Date()): number | null {
  if (!offer.endDate) return null;
  const end = Date.parse(offer.endDate);
  if (!Number.isFinite(end)) return null;
  return Math.ceil((end - now.getTime()) / 86_400_000);
}

/**
 * True only for an offer that is currently active AND ends within `thresholdDays`.
 * An already-expired offer is not "nearing" expiry (it's just gone), and an
 * open-ended offer with no end date never triggers this - there is nothing to warn about.
 */
export function isNearingExpiry(offer: Pick<OfferResult, "startDate" | "endDate">, thresholdDays: number, now = new Date()): boolean {
  if (!isOfferActive(offer, now)) return false;
  const days = daysUntilExpiry(offer, now);
  return days !== null && days <= thresholdDays;
}
