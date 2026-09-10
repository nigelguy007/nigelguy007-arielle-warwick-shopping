import { describe, expect, it } from "vitest";
import { evaluatePriceChange, matchTrackedProduct, priceDropNotification, voucherExpiryNotification } from "@/lib/alerts/detect";
import { daysUntilExpiry, isNearingExpiry } from "@/lib/offers/expiry";
import { NOW, offer, product } from "./fixtures";

const day = 86_400_000;
const watch = (overrides: Partial<{ lastPrice: number }> = {}) => ({
  id: "w1",
  userId: "u",
  itemKey: "k",
  label: "Kettle",
  retailer: "Argos",
  currency: "GBP",
  productUrl: null,
  lastCheckedAt: NOW.toISOString(),
  lastPrice: 10,
  ...overrides,
});

describe("matchTrackedProduct", () => {
  it("matches by product id first, even if the title changed", () => {
    const results = [product({ id: "a", retailer: "Argos", title: "Other" }), product({ id: "b", retailer: "Argos", title: "Renamed Kettle" })];
    expect(matchTrackedProduct(results, { label: "Kettle", productId: "b", retailer: "Argos" })?.id).toBe("b");
  });
  it("falls back to same retailer + exact title when the id no longer appears", () => {
    const results = [product({ id: "new-id", retailer: "Argos", title: "Kettle" })];
    expect(matchTrackedProduct(results, { label: "Kettle", productId: "gone", retailer: "Argos" })?.id).toBe("new-id");
  });
  it("never guesses a match across retailers or titles", () => {
    const results = [product({ id: "x", retailer: "Argos", title: "Toaster" }), product({ id: "y", retailer: "Currys", title: "Kettle" })];
    expect(matchTrackedProduct(results, { label: "Kettle", productId: null, retailer: "Argos" })).toBeNull();
  });
});

describe("evaluatePriceChange", () => {
  it("never claims a drop on the first sighting - nothing to compare against", () => {
    const change = evaluatePriceChange(product({ totalPrice: 10 }), null, 0.5);
    expect(change).toEqual({ isDrop: false, previousPrice: null, currentPrice: 10, saving: 0 });
  });
  it("does not fire below the minimum saving threshold", () => {
    expect(evaluatePriceChange(product({ totalPrice: 9.6 }), watch(), 0.5).isDrop).toBe(false);
  });
  it("fires once the saving clears the threshold", () => {
    const change = evaluatePriceChange(product({ totalPrice: 8 }), watch(), 0.5);
    expect(change).toEqual({ isDrop: true, previousPrice: 10, currentPrice: 8, saving: 2 });
  });
  it("never fires on a price rise", () => {
    expect(evaluatePriceChange(product({ totalPrice: 12 }), watch(), 0.5).isDrop).toBe(false);
  });
  it("never fires when the price is unchanged", () => {
    expect(evaluatePriceChange(product({ totalPrice: 10 }), watch(), 0.5).isDrop).toBe(false);
  });
});

describe("expiry helpers used by the alerts job", () => {
  it("computes whole days until expiry, or null when it can't", () => {
    expect(daysUntilExpiry(offer({ endDate: null }), NOW)).toBeNull();
    expect(daysUntilExpiry(offer({ endDate: new Date(NOW.getTime() + 2 * day).toISOString() }), NOW)).toBe(2);
  });
  it("flags only active offers ending within the threshold", () => {
    expect(isNearingExpiry(offer({ endDate: new Date(NOW.getTime() + 2 * day).toISOString() }), 3, NOW)).toBe(true);
    expect(isNearingExpiry(offer({ endDate: new Date(NOW.getTime() + 10 * day).toISOString() }), 3, NOW)).toBe(false);
    expect(isNearingExpiry(offer({ endDate: new Date(NOW.getTime() - day).toISOString() }), 3, NOW)).toBe(false);
    expect(isNearingExpiry(offer({ endDate: null }), 3, NOW)).toBe(false);
    expect(isNearingExpiry(offer({ startDate: new Date(NOW.getTime() + day).toISOString(), endDate: new Date(NOW.getTime() + 2 * day).toISOString() }), 3, NOW)).toBe(false);
  });
});

describe("notification copy never fabricates numbers", () => {
  it("reports exactly the saving evaluatePriceChange computed", () => {
    const change = evaluatePriceChange(product({ totalPrice: 8 }), watch(), 0.5);
    const n = priceDropNotification("Kettle", "Argos", change, "https://example.com/kettle", "GBP");
    expect(n.body).toContain("save GBP 2.00");
    expect(n.body).toContain("https://example.com/kettle");
    expect(n.meta).toEqual({ retailer: "Argos", previousPrice: 10, currentPrice: 8, saving: 2, productUrl: "https://example.com/kettle" });
  });
  it("labels an unverified offer as potential, not confirmed", () => {
    const n = voucherExpiryNotification(offer({ verified: false, endDate: new Date(NOW.getTime() + day).toISOString(), code: null }), NOW);
    expect(n.title).toContain("Potential offer");
    expect(n.body).not.toContain("Code:");
  });
  it("labels a verified offer clearly and includes its code", () => {
    const n = voucherExpiryNotification(offer({ verified: true, endDate: NOW.toISOString(), code: "TEN" }), NOW);
    expect(n.title).toContain("Verified voucher");
    expect(n.body).toContain("ends today");
    expect(n.body).toContain("Code: TEN.");
  });
});
