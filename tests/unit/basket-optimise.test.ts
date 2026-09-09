import { describe, expect, it } from "vitest";
import { optimiseBasket } from "@/lib/services/basket-optimise";
import { basketLine, offer, product, store, NOW } from "./fixtures";

const argosPan = product({ id: "argos-pan", retailer: "Argos", title: "Pan", currentPrice: 12, totalPrice: 12 });
const ikeaPan = product({ id: "ikea-pan", retailer: "IKEA", title: "Pan", currentPrice: 10, totalPrice: 10 });
const argosDuvet = product({ id: "argos-duvet", retailer: "Argos", title: "Duvet", currentPrice: 18, totalPrice: 18 });
const dunelmDuvet = product({ id: "dunelm-duvet", retailer: "Dunelm", title: "Duvet", currentPrice: 14, totalPrice: 14 });

const basket = [basketLine(ikeaPan, 1, "l1"), basketLine(dunelmDuvet, 1, "l2")];
const alternatives = [
  { basketItemId: "l1", candidates: [{ product: argosPan, score: 0.8 }, { product: ikeaPan, score: 0.7 }] },
  { basketItemId: "l2", candidates: [{ product: argosDuvet, score: 0.6 }, { product: dunelmDuvet, score: 0.9 }] },
];

describe("basket optimisation", () => {
  it("cheapest minimises total", () => {
    const r = optimiseBasket(basket, alternatives, "cheapest", { offers: [], stores: [], now: NOW });
    expect(r.items.map((i) => i.productSnapshot.id)).toEqual(["ikea-pan", "dunelm-duvet"]);
    expect(r.totals.estimatedTotal).toBe(24);
  });
  it("one shop minimises retailer count", () => {
    const r = optimiseBasket(basket, alternatives, "one_shop", { offers: [], stores: [], now: NOW });
    expect(r.items.map((i) => i.productSnapshot.retailer)).toEqual(["Argos", "Argos"]);
    expect(r.totals.retailerCount).toBe(1);
    expect(r.note).toBe("Everything from one shop.");
  });
  it("best value uses the score", () => {
    const r = optimiseBasket(basket, alternatives, "best_value", { offers: [], stores: [], now: NOW });
    expect(r.items.map((i) => i.productSnapshot.id)).toEqual(["argos-pan", "dunelm-duvet"]);
  });
  it("local today keeps lines without an open nearby store unchanged", () => {
    const r = optimiseBasket(basket, alternatives, "local_today", { offers: [], stores: [store({ retailerKey: "Argos", openNow: true })], now: NOW });
    expect(r.items.map((i) => i.productSnapshot.retailer)).toEqual(["Argos", "Argos"]);
    const closed = optimiseBasket(basket, alternatives, "local_today", { offers: [], stores: [store({ retailerKey: "Argos", openNow: false })], now: NOW });
    expect(closed.items.map((i) => i.productSnapshot.id)).toEqual(["ikea-pan", "dunelm-duvet"]);
  });
  it("student deals only counts verified in-date offers", () => {
    const expired = offer({ retailer: "Argos", verified: true, endDate: new Date(NOW.getTime() - 1).toISOString() });
    const r = optimiseBasket(basket, alternatives, "student_deals", { offers: [expired], stores: [], now: NOW });
    expect(r.items.map((i) => i.productSnapshot.id)).toEqual(["argos-pan", "dunelm-duvet"]); // falls back to best value
    const live = offer({ retailer: "Dunelm", verified: true, percentage: 10 });
    const r2 = optimiseBasket(basket, alternatives, "student_deals", { offers: [live], stores: [], now: NOW });
    expect(r2.items[1].productSnapshot.retailer).toBe("Dunelm");
    expect(r2.totals.confirmedSavings).toBe(1.4);
  });
});
