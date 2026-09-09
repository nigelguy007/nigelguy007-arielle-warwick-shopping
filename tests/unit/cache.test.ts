import { describe, expect, it } from "vitest";
import { TtlCache, ageLabel, hashKey } from "@/lib/cache";

describe("TtlCache", () => {
  it("expires entries", () => {
    const c = new TtlCache<number>();
    c.set("a", 1, 1000, 0);
    expect(c.get("a", 500)?.value).toBe(1);
    expect(c.get("a", 1001)).toBeNull();
  });
  it("hashes keys order-independently", () => {
    expect(hashKey({ a: 1, b: 2 })).toBe(hashKey({ b: 2, a: 1 }));
    expect(hashKey({ a: 1 })).not.toBe(hashKey({ a: 2 }));
  });
  it("labels age", () => {
    const now = Date.parse("2026-09-09T12:00:00Z");
    expect(ageLabel(now - 14 * 60000, now)).toBe("Checked 14 minutes ago");
    expect(ageLabel(now, now)).toBe("Checked just now");
  });
});
