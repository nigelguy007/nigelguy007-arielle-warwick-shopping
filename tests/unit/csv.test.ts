import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { initialStatusFor, makeSourceKey, normalisePriority, normaliseTiming, parseChecklistCsv, parseCsv, parseMoney, parseYesNo } from "@/lib/checklist/csv";

describe("parseCsv", () => {
  it("handles quotes, escaped quotes, commas and CRLF", () => {
    const rows = parseCsv('a,b,c\r\n"x, y","he said ""hi""",3\n');
    expect(rows).toEqual([
      ["a", "b", "c"],
      ["x, y", 'he said "hi"', "3"],
    ]);
  });
  it("drops blank lines", () => {
    expect(parseCsv("a,b\n\n1,2\n")).toHaveLength(2);
  });
});

describe("normalisers", () => {
  it("maps priorities", () => {
    expect(normalisePriority("Essential")).toBe("essential");
    expect(normalisePriority("recommended")).toBe("recommended");
    expect(normalisePriority("nice to have")).toBe("optional");
  });
  it("maps When -> timing", () => {
    expect(normaliseTiming("Buy before Warwick")).toBe("buy_before");
    expect(normaliseTiming("Take from home")).toBe("take_from_home");
    expect(normaliseTiming("Wait until arrival")).toBe("wait_until_arrival");
    expect(normaliseTiming("Do not buy yet")).toBe("do_not_buy_yet");
  });
  it("parses yes/no and money", () => {
    expect(parseYesNo("Yes")).toBe(true);
    expect(parseYesNo("no")).toBe(false);
    expect(parseYesNo(undefined)).toBe(false);
    expect(parseMoney("£12.50")).toBe(12.5);
    expect(parseMoney("")).toBeNull();
  });
  it("builds stable source keys", () => {
    expect(makeSourceKey("Kitchen", "Frying pan")).toBe("kitchen/frying-pan");
    expect(makeSourceKey("B&M stuff", "Mug (large)")).toBe("b-and-m-stuff/mug-large");
  });
});

describe("parseChecklistCsv", () => {
  const header = "Category,Item,Priority,When,Qty,Budget (£),Bought?,Packed?,Notes\n";
  it("imports every row and preserves notes", () => {
    const rows = parseChecklistCsv(header + 'Bedding,Duvet,Essential,Buy before Warwick,1,25,No,No,"Check bed size, first"\nKitchen,Kettle,Essential,Do not buy yet,1,15,No,No,Supplied\n');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ sourceKey: "bedding/duvet", priority: "essential", timing: "buy_before", defaultQty: 1, budgetEstimate: 25, notes: "Check bed size, first" });
    expect(rows[1].timing).toBe("do_not_buy_yet");
  });
  it("does not drop duplicate items silently", () => {
    const rows = parseChecklistCsv(header + "Kitchen,Mug,Optional,Buy before Warwick,1,,,,\nKitchen,Mug,Optional,Buy before Warwick,2,,,,\n");
    expect(rows.map((r) => r.sourceKey)).toEqual(["kitchen/mug", "kitchen/mug-2"]);
  });
  it("throws on missing required columns", () => {
    expect(() => parseChecklistCsv("Item,Qty\nDuvet,1\n")).toThrow(/missing required column/);
  });
  it("derives first-import status: Bought/Packed flags win, then timing", () => {
    expect(initialStatusFor({ bought: true, packed: true, timing: "buy_before" })).toBe("packed");
    expect(initialStatusFor({ bought: true, packed: false, timing: "buy_before" })).toBe("bought");
    expect(initialStatusFor({ bought: false, packed: false, timing: "buy_before" })).toBe("buy");
    expect(initialStatusFor({ bought: false, packed: false, timing: "take_from_home" })).toBe("need");
    expect(initialStatusFor({ bought: false, packed: false, timing: "wait_until_arrival" })).toBe("wait");
    expect(initialStatusFor({ bought: false, packed: false, timing: "do_not_buy_yet" })).toBe("do_not_buy");
  });
  it("parses the shipped checklist without losing rows", () => {
    const csv = readFileSync(path.join(process.cwd(), "data", "warwick_move_in_checklist.csv"), "utf8");
    const lines = csv.trim().split("\n").length - 1;
    const rows = parseChecklistCsv(csv);
    expect(rows).toHaveLength(lines);
    expect(new Set(rows.map((r) => r.sourceKey)).size).toBe(rows.length);
  });
});
