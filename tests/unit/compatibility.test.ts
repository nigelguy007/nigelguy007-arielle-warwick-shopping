import { describe, expect, it } from "vitest";
import { accommodationWarningFor, categoryOfItem, checkProductCompatibility, isSuppliedByHall } from "@/lib/ranking/compatibility";
import { item, product, profile } from "./fixtures";

describe("categoryOfItem", () => {
  it("classifies", () => {
    expect(categoryOfItem({ category: "Bedding", item: "Duvet" })).toBe("bedding");
    expect(categoryOfItem({ category: "Kitchen", item: "Frying pan" })).toBe("cookware");
    expect(categoryOfItem({ category: "Kitchen", item: "Kettle" })).toBe("appliance");
    expect(categoryOfItem({ category: "Room", item: "Desk chair" })).toBe("furniture");
    expect(categoryOfItem({ category: "Study", item: "Pens" })).toBe("other");
  });
});

describe("hard compatibility rules", () => {
  const pan = item({ category: "Kitchen", item: "Frying pan" });

  it("CRITICAL: a non-induction pan is excluded when the hall has an induction hob", () => {
    const cheap = product({ title: "Non-stick frying pan", description: "Not suitable for induction hobs", attributes: ["not induction"], currentPrice: 5, totalPrice: 5 });
    const ok = product({ title: "Induction frying pan", attributes: ["induction"], currentPrice: 12, totalPrice: 12 });
    const unknown = product({ title: "Frying pan 24cm", description: "aluminium" });
    expect(checkProductCompatibility(pan, cheap, profile({ hobType: "induction" })).ok).toBe(false);
    expect(checkProductCompatibility(pan, unknown, profile({ hobType: "induction" })).ok).toBe(false);
    expect(checkProductCompatibility(pan, ok, profile({ hobType: "induction" })).ok).toBe(true);
  });

  it("only warns when hob type is unknown or unverified", () => {
    const anyPan = product({ title: "Frying pan" });
    const v = checkProductCompatibility(pan, anyPan, profile({ hobType: "unknown" }));
    expect(v.ok).toBe(true);
    expect(v.warnings[0]).toMatch(/Hob type not confirmed/);
    expect(checkProductCompatibility(pan, anyPan, profile({ verifiedAt: null, hobType: "induction" })).ok).toBe(true);
    expect(checkProductCompatibility(pan, anyPan, null).ok).toBe(true);
  });

  it("excludes supplied appliances and prohibited items", () => {
    const kettle = item({ category: "Kitchen", item: "Kettle" });
    expect(checkProductCompatibility(kettle, product({ title: "Jug kettle" }), profile())).toMatchObject({ ok: false, reason: "Warwick already provides this" });
    expect(isSuppliedByHall(kettle, profile({ verifiedAt: null }))).toBe(false);
    const candle = item({ category: "Room", item: "Scented candles" });
    expect(checkProductCompatibility(candle, product({ title: "Candle" }), profile()).ok).toBe(false);
  });

  it("enforces confirmed bed size and flags unconfirmed", () => {
    const duvet = item({ category: "Bedding", item: "Duvet" });
    expect(checkProductCompatibility(duvet, product({ title: "Double duvet 10.5 tog" }), profile({ bedSize: "single" })).ok).toBe(false);
    expect(checkProductCompatibility(duvet, product({ title: "Single duvet 10.5 tog" }), profile({ bedSize: "single" })).ok).toBe(true);
    expect(checkProductCompatibility(duvet, product({ title: "Small double duvet" }), profile({ bedSize: "double" })).ok).toBe(false);
    const unsized = checkProductCompatibility(duvet, product({ title: "Cosy duvet" }), profile({ bedSize: "single" }));
    expect(unsized.ok).toBe(true);
    expect(unsized.warnings).toContain("Size not stated in listing - check it matches your bed");
    const noProfile = checkProductCompatibility(duvet, product({ title: "Single duvet" }), null);
    expect(noProfile.warnings).toContain("Bed size not confirmed");
  });

  it("produces human warnings", () => {
    expect(accommodationWarningFor({ category: "Bedding", item: "Duvet" }, null)).toBe("Tell me your Warwick accommodation before I recommend bedding.");
    expect(accommodationWarningFor({ category: "Kitchen", item: "Kettle" }, profile())).toBe("Warwick already provides this.");
    expect(accommodationWarningFor({ category: "Kitchen", item: "Saucepan" }, profile())).toMatch(/Induction hob/);
  });
});
