import { describe, expect, it } from "vitest";
import { canTransition, groupByBox, isChecklistStatus, notPacked, packableItems, packingProgress, stillNeeded, summarise, UNBOXED } from "@/lib/checklist/status";
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

describe("packing mode", () => {
  it("only surfaces items Arielle actually has (have/bought/packed)", () => {
    const items = [item({ status: "buy" }), item({ status: "need" }), item({ status: "bought" }), item({ status: "packed" }), item({ status: "have" }), item({ status: "wait" }), item({ status: "do_not_buy" })];
    expect(packableItems(items).map((i) => i.status).sort()).toEqual(["bought", "have", "packed"]);
  });

  it("groups by box, with unboxed items last and sorted alphabetically otherwise", () => {
    const items = [
      item({ id: "a", item: "Duvet", box: "Box 2", status: "bought" }),
      item({ id: "b", item: "Towels", box: "Box 1", status: "have" }),
      item({ id: "c", item: "Kettle", box: "", status: "have" }),
      item({ id: "d", item: "Pillow", box: "Box 1", status: "packed" }),
    ];
    const groups = groupByBox(items);
    expect(groups.map((g) => g.box)).toEqual(["Box 1", "Box 2", UNBOXED]);
    expect(groups[0].items.map((i) => i.item)).toEqual(["Towels", "Pillow"]);
    expect(groups[2].items.map((i) => i.item)).toEqual(["Kettle"]);
  });

  it("treats whitespace-only box labels as unboxed", () => {
    const items = [item({ id: "a", box: "   " })];
    expect(groupByBox(items)[0].box).toBe(UNBOXED);
  });

  it("computes packed progress", () => {
    const items = [item({ status: "have" }), item({ status: "packed" }), item({ status: "packed" }), item({ status: "bought" })];
    expect(packingProgress(items)).toEqual({ total: 4, packed: 2 });
  });
});
