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
