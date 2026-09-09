import { describe, expect, it } from "vitest";
import { calculateBasket, fitToBudget, round2, summariseBudget } from "@/lib/budget/math";
import { basketLine, offer, product, NOW } from "./fixtures";

describe("basket maths", () => {
  it("groups by retailer, charges delivery once per retailer", () => {
    const a = product({ id: "a", retailer: "Dunelm", currentPrice: 10, deliveryPrice: 3.95, totalPrice: 13.95 });
    const b = product({ id: "b", retailer: "Dunelm", currentPrice: 5, deliveryPrice: 3.95, totalPrice: 8.95 });
    const c = product({ id: "c", retailer: "Argos", currentPrice: 7, deliveryPrice: 0, totalPrice: 7 });
    const t = calculateBasket([basketLine(a), basketLine(b, 2), basketLine(c)], [], NOW);
    expect(t.retailerCount).toBe(2);
    expect(t.itemCount).toBe(4);
    expect(t.subtotal).toBe(27);
    expect(t.delivery).toBe(3.95);
    expect(t.estimatedTotal).toBe(30.95);
  });

  it("applies verified in-date offers and reports unverified ones separately", () => {
    const a = product({ id: "a", retailer: "Dunelm", currentPrice: 40, totalPrice: 40 });
    const verified = offer({ retailer: "Dunelm", percentage: 10, verified: true, endDate: new Date(NOW.getTime() + 86400000).toISOString() });
    const unverified = offer({ retailer: "Dunelm", percentage: 50, verified: false });
    const t = calculateBasket([basketLine(a)], [verified, unverified], NOW);
    expect(t.confirmedSavings).toBe(4);
    expect(t.estimatedTotal).toBe(36);
    expect(t.potentialSavings).toBe(0); // verified beats unverified for the same retailer
    const t2 = calculateBasket([basketLine(a)], [unverified], NOW);
    expect(t2.confirmedSavings).toBe(0);
    expect(t2.potentialSavings).toBe(20);
    expect(t2.estimatedTotal).toBe(40);
  });

  it("CRITICAL: expired vouchers never reduce the basket total", () => {
    const a = product({ id: "a", retailer: "IKEA", currentPrice: 30, totalPrice: 30 });
    const expired = offer({ retailer: "IKEA", percentage: 15, verified: true, endDate: new Date(NOW.getTime() - 60_000).toISOString() });
    const t = calculateBasket([basketLine(a)], [expired], NOW);
    expect(t.confirmedSavings).toBe(0);
    expect(t.potentialSavings).toBe(0);
    expect(t.estimatedTotal).toBe(30);
  });

  it("summarises budget with spent and committed", () => {
    const totals = calculateBasket([basketLine(product({ currentPrice: 20, totalPrice: 20 }))], [], NOW);
    const s = summariseBudget({ id: "b", userId: "u", name: "x", amount: 200, currency: "GBP", createdAt: "" }, [{ id: "p", userId: "u", checklistItemId: null, productSnapshot: null, retailer: "", paidPrice: 45.5, voucherUsed: null, purchasedAt: "" }], totals);
    expect(s).toEqual({ budget: 200, spent: 45.5, committed: 20, remaining: 154.5, remainingAfterBasket: 134.5 });
    expect(summariseBudget(null, [], totals).remaining).toBeNull();
  });

  it("fits ordered items into a budget greedily", () => {
    const { chosen, total } = fitToBudget([{ price: 30, n: 1 }, { price: 50, n: 2 }, { price: 15, n: 3 }], 60);
    expect(chosen.map((c) => c.n)).toEqual([1, 3]);
    expect(total).toBe(45);
  });

  it("rounds money to pennies", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(1.005)).toBe(1.01);
  });
});
