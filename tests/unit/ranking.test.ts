import { describe, expect, it } from "vitest";
import { pickRecommendations, scoreProducts } from "@/lib/ranking/value-score";
import { item, offer, product, profile, store, NOW } from "./fixtures";

describe("value score", () => {
  const pan = item({ category: "Kitchen", item: "Frying pan" });

  it("CRITICAL: a £5 non-induction pan never outranks a £12 induction pan on an induction hob", () => {
    const cheap = product({ id: "cheap", title: "Frying pan", attributes: ["not induction"], currentPrice: 5, totalPrice: 5, rating: 5, reviewCount: 9999 });
    const good = product({ id: "good", title: "Induction frying pan", attributes: ["induction"], currentPrice: 12, totalPrice: 12 });
    const { ranked, excluded } = scoreProducts([cheap, good], { item: pan, profile: profile({ hobType: "induction" }), now: NOW });
    expect(ranked.map((r) => r.product.id)).toEqual(["good"]);
    expect(excluded[0]).toMatchObject({ product: { id: "cheap" }, reason: expect.stringMatching(/induction/i) });
    const recs = pickRecommendations([cheap, good], { item: pan, profile: profile({ hobType: "induction" }), now: NOW });
    expect(recs.cheapest?.product.id).toBe("good");
  });

  it("does not simply pick the cheapest: rating, credibility and offers matter", () => {
    const junk = product({ id: "junk", retailer: "RandomShop", title: "Pan induction", attributes: ["induction"], currentPrice: 9, totalPrice: 9, rating: 2.1, reviewCount: 400, deliveryDays: 7 });
    const solid = product({ id: "solid", retailer: "Argos", title: "Pan induction", attributes: ["induction"], currentPrice: 12, totalPrice: 12, rating: 4.7, reviewCount: 2000, deliveryDays: 1 });
    const { ranked } = scoreProducts([junk, solid], { item: pan, profile: profile(), offers: [offer({ retailer: "Argos", percentage: 10 })], now: NOW });
    expect(ranked[0].product.id).toBe("solid");
    expect(ranked[0].effectivePrice).toBe(10.8);
    expect(ranked[0].reasons).toContain("Well reviewed");
  });

  it("returns cheapest / best value / nearby and fewer when there aren't enough credible options", () => {
    const a = product({ id: "a", retailer: "Argos", title: "Induction pan", attributes: ["induction"], currentPrice: 8, totalPrice: 8, rating: 3.5, reviewCount: 10 });
    const b = product({ id: "b", retailer: "IKEA", title: "Induction pan", attributes: ["induction"], currentPrice: 10, totalPrice: 10, rating: 4.8, reviewCount: 3000 });
    const c = product({ id: "c", retailer: "Dunelm", title: "Induction pan", attributes: ["induction"], currentPrice: 15, totalPrice: 15, rating: 4.2, reviewCount: 300 });
    const recs = pickRecommendations([a, b, c], { item: pan, profile: profile(), stores: [store({ retailerKey: "Dunelm", name: "Dunelm Coventry", distanceMeters: 1500 })], now: NOW });
    expect(recs.cheapest?.product.id).toBe("a");
    expect(recs.bestValue?.product.id).toBe("b");
    expect(recs.nearby?.product.id).toBe("c");
    expect(recs.nearby?.nearbyStore?.name).toBe("Dunelm Coventry");
    const single = pickRecommendations([a], { item: pan, profile: profile(), now: NOW });
    expect(single.cheapest?.product.id).toBe("a");
    expect(single.bestValue).toBeNull();
    expect(single.nearby).toBeNull();
  });

  it("uses total price including delivery", () => {
    const freeDelivery = product({ id: "f", title: "Induction pan", attributes: ["induction"], currentPrice: 11, deliveryPrice: 0, totalPrice: 11 });
    const paidDelivery = product({ id: "p", title: "Induction pan", attributes: ["induction"], currentPrice: 9, deliveryPrice: 3.95, totalPrice: 12.95 });
    const recs = pickRecommendations([freeDelivery, paidDelivery], { item: pan, profile: profile(), now: NOW });
    expect(recs.cheapest?.product.id).toBe("f");
  });
});
