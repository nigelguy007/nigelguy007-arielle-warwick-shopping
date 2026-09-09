import { describe, expect, it } from "vitest";
import { applyOffer, bestApplicableOffer, offerMatchesRetailer, priceWithOffers, retailerKey } from "@/lib/offers/discount";
import { describeExpiry, filterActiveOffers, isOfferActive } from "@/lib/offers/expiry";
import { offer, NOW } from "./fixtures";

const day = 86_400_000;

describe("expiry", () => {
  it("treats open-ended offers as active and expired ones as inactive", () => {
    expect(isOfferActive(offer({ endDate: null }), NOW)).toBe(true);
    expect(isOfferActive(offer({ endDate: new Date(NOW.getTime() - day).toISOString() }), NOW)).toBe(false);
    expect(isOfferActive(offer({ startDate: new Date(NOW.getTime() + day).toISOString() }), NOW)).toBe(false);
    expect(isOfferActive(offer({ startDate: new Date(NOW.getTime() - day).toISOString(), endDate: new Date(NOW.getTime() + day).toISOString() }), NOW)).toBe(true);
  });
  it("filters lists", () => {
    const list = [offer({ id: "live" }), offer({ id: "dead", endDate: new Date(NOW.getTime() - 1).toISOString() })];
    expect(filterActiveOffers(list, NOW).map((o) => o.id)).toEqual(["live"]);
  });
  it("describes expiry", () => {
    expect(describeExpiry(offer({ endDate: null }), NOW)).toBe("No end date listed");
    expect(describeExpiry(offer({ endDate: new Date(NOW.getTime() - day).toISOString() }), NOW)).toBe("Expired");
    expect(describeExpiry(offer({ endDate: new Date(NOW.getTime() + 3 * day).toISOString() }), NOW)).toBe("Ends in 3 days");
  });
});

describe("discount maths", () => {
  it("applies percentage and fixed amounts with min spend", () => {
    expect(applyOffer(50, offer({ percentage: 10 }))).toEqual({ price: 45, saving: 5 });
    expect(applyOffer(50, offer({ percentage: null, amount: 5 }))).toEqual({ price: 45, saving: 5 });
    expect(applyOffer(40, offer({ percentage: null, amount: 5, minSpend: 50 }))).toEqual({ price: 40, saving: 0 });
    expect(applyOffer(3, offer({ percentage: null, amount: 5 }))).toEqual({ price: 0, saving: 3 });
  });
  it("matches retailers loosely", () => {
    expect(retailerKey("Sainsbury's")).toBe("sainsburys");
    expect(offerMatchesRetailer(offer({ retailer: "Argos" }), "Argos (UK)")).toBe(true);
    expect(offerMatchesRetailer(offer({ retailer: "Argos" }), "Currys")).toBe(false);
  });
  it("prefers verified offers over larger unverified ones and skips expired", () => {
    const offers = [offer({ id: "unv", percentage: 50, verified: false }), offer({ id: "ver", percentage: 10, verified: true }), offer({ id: "exp", percentage: 90, verified: true, endDate: new Date(NOW.getTime() - 1).toISOString() })];
    expect(bestApplicableOffer(offers, "Argos", 100, NOW)?.id).toBe("ver");
    const p = priceWithOffers(100, "Argos", offers, NOW);
    expect(p.listed).toBe(100);
    expect(p.estimatedAfterVerified).toBe(90);
    expect(p.unverifiedOffer?.id).toBe("unv");
  });
});
