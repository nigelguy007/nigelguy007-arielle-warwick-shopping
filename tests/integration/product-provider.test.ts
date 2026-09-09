import { describe, expect, it } from "vitest";
import { MockProductProvider } from "@/lib/providers/product/mock";
import { SerpApiProductProvider } from "@/lib/providers/product/serpapi";

describe("MockProductProvider", () => {
  it("returns labelled mock results with source + checkedAt", async () => {
    const res = await new MockProductProvider().search({ query: "duvet" });
    expect(res.length).toBeGreaterThan(1);
    for (const r of res) {
      expect(r.sourceConfidence).toBe("mock");
      expect(r.provider).toBe("mock");
      expect(Date.parse(r.checkedAt)).toBeGreaterThan(0);
      expect(r.totalPrice).toBeCloseTo(r.currentPrice + (r.deliveryPrice ?? 0), 2);
    }
  });
  it("respects max price and exclusions", async () => {
    const res = await new MockProductProvider().search({ query: "frying pan", maxPrice: 11, excludedAttributes: ["not induction"] });
    expect(res.every((r) => r.totalPrice <= 11 && !r.attributes.includes("not induction"))).toBe(true);
  });
});

describe("SerpApiProductProvider (mocked HTTP)", () => {
  const fakeFetch: typeof fetch = async (input) => {
    const url = String(input);
    expect(url).toContain("engine=google_shopping");
    expect(url).toContain("gl=uk");
    return new Response(JSON.stringify({ shopping_results: [{ title: "Single Duvet 10.5 Tog", product_id: "1", source: "Dunelm", extracted_price: 14, delivery: "Free delivery", rating: 4.5, reviews: 120, link: "https://www.dunelm.com/x" }, { title: "No price", source: "X" }] }), { status: 200 });
  };
  it("maps results and marks them unverified", async () => {
    const res = await new SerpApiProductProvider("key", fakeFetch).search({ query: "duvet" });
    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({ provider: "serpapi", retailer: "Dunelm", currentPrice: 14, deliveryPrice: 0, totalPrice: 14, sourceConfidence: "unverified", attributes: ["single"] });
  });
  it("throws on HTTP errors", async () => {
    const bad: typeof fetch = async () => new Response("nope", { status: 500 });
    await expect(new SerpApiProductProvider("key", bad).search({ query: "duvet" })).rejects.toThrow(/500/);
  });
  it.runIf(process.env.SERPAPI_API_KEY)("LIVE: returns UK results", async () => {
    const res = await new SerpApiProductProvider(process.env.SERPAPI_API_KEY as string).search({ query: "single duvet", limit: 5 });
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].currency).toBe("GBP");
  });
});
