import { describe, expect, it } from "vitest";
import { buyNext, suppliedItems } from "@/lib/recommendations/buy-next";
import { item, profile } from "./fixtures";

describe("buy next", () => {
  it("CRITICAL: a supplied appliance never appears in Buy next", () => {
    const kettle = item({ id: "kettle", category: "Kitchen", item: "Kettle", status: "buy", priority: "essential" });
    const duvet = item({ id: "duvet", category: "Bedding", item: "Duvet", status: "buy", priority: "essential" });
    const out = buyNext([kettle, duvet], profile(), { limit: 5 });
    expect(out.map((c) => c.item.id)).toEqual(["duvet"]);
    expect(suppliedItems([kettle, duvet], profile()).map((i) => i.id)).toEqual(["kettle"]);
    // Unverified profile: nothing is assumed supplied, but the kettle is still shown only if the checklist says buy.
    expect(buyNext([kettle, duvet], profile({ verifiedAt: null }), { limit: 5 }).map((c) => c.item.id)).toEqual(["kettle", "duvet"]);
  });

  it("orders by priority, then timing, then bigger cost first, and skips owned/wait/do-not-buy/furniture", () => {
    const items = [
      item({ id: "opt", priority: "optional", budgetEstimate: 2 }),
      item({ id: "ess-cheap", priority: "essential", budgetEstimate: 5 }),
      item({ id: "ess-dear", priority: "essential", budgetEstimate: 50 }),
      item({ id: "rec", priority: "recommended", budgetEstimate: 8 }),
      item({ id: "have", status: "have" }),
      item({ id: "wait", timing: "wait_until_arrival", status: "wait" }),
      item({ id: "home", timing: "take_from_home", status: "need" }),
      item({ id: "chair", category: "Room", item: "Desk chair", priority: "recommended" }),
    ];
    expect(buyNext(items, null, { limit: 10 }).map((c) => c.item.id)).toEqual(["ess-dear", "ess-cheap", "rec", "opt"]);
  });

  it("prefers items that fit the remaining budget", () => {
    const items = [item({ id: "dear", priority: "essential", budgetEstimate: 80 }), item({ id: "cheap", priority: "essential", budgetEstimate: 10 }), item({ id: "mid", priority: "recommended", budgetEstimate: 20 })];
    expect(buyNext(items, null, { budgetRemaining: 25, limit: 3 }).map((c) => c.item.id)).toEqual(["cheap", "mid", "dear"]);
  });

  it("flags unconfirmed bed size and induction requirement in the reason", () => {
    const duvet = item({ id: "duvet", category: "Bedding", item: "Duvet" });
    const pan = item({ id: "pan", category: "Kitchen", item: "Saucepan" });
    const out = buyNext([duvet, pan], profile({ bedSize: "unknown" }), { limit: 5 });
    expect(out.find((c) => c.item.id === "duvet")?.reason).toMatch(/bed size not confirmed/);
    expect(out.find((c) => c.item.id === "pan")?.reason).toMatch(/induction/);
  });
});
