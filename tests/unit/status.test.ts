import { describe, expect, it } from "vitest";
import { canTransition, isChecklistStatus, notPacked, stillNeeded, summarise } from "@/lib/checklist/status";
import { item } from "./fixtures";

describe("status transitions", () => {
  it("allows the main lifecycle", () => {
    expect(canTransition("need", "buy")).toBe(true);
    expect(canTransition("buy", "bought")).toBe(true);
    expect(canTransition("bought", "packed")).toBe(true);
    expect(canTransition("have", "packed")).toBe(true);
  });
  it("lets Arielle undo", () => {
    expect(canTransition("packed", "bought")).toBe(true);
    expect(canTransition("bought", "buy")).toBe(true);
  });
  it("blocks nonsense", () => {
    expect(canTransition("packed", "wait")).toBe(false);
    expect(canTransition("packed", "do_not_buy")).toBe(false);
    expect(canTransition("bought", "wait")).toBe(false);
  });
  it("validates status strings", () => {
    expect(isChecklistStatus("bought")).toBe(true);
    expect(isChecklistStatus("nope")).toBe(false);
  });
});

describe("summaries", () => {
  const items = [item({ status: "buy" }), item({ status: "need" }), item({ status: "bought" }), item({ status: "packed" }), item({ status: "have", priority: "optional" }), item({ status: "wait" })];
  it("counts still needed / bought / packed", () => {
    expect(summarise(items)).toMatchObject({ total: 6, stillNeeded: 2, bought: 2, packed: 1, essentialsTotal: 5, essentialsDone: 2 });
    expect(stillNeeded(items)).toHaveLength(2);
    expect(notPacked(items)).toHaveLength(4);
  });
});
