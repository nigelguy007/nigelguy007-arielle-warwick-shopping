import { describe, expect, it } from "vitest";
import { MockProductProvider } from "@/lib/providers/product/mock";
import { SerpApiProductProvider } from "@/lib/providers/product/serpapi";
import { AwinFeedProductProvider } from "@/lib/providers/product/awin-feed";

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

describe("AwinFeedProductProvider (mocked HTTP)", () => {
  // Column order must match FEED_COLUMNS in src/lib/providers/product/awin-feed.ts.
  const FEED_HEADER = [
    "aw_product_id",
    "merchant_product_id",
    "product_name",
    "description",
    "aw_deep_link",
    "merchant_deep_link",
    "aw_image_url",
    "merchant_image_url",
    "merchant_name",
    "merchant_id",
    "merchant_category",
    "category_name",
    "search_price",
    "store_price",
    "rrp_price",
    "currency",
    "delivery_cost",
    "in_stock",
    "stock_quantity",
    "last_updated",
    "brand_name",
    "colour",
    "ean",
    "mpn",
  ];
  function feedRow(fields: Record<string, string>): string {
    return FEED_HEADER.map((h) => fields[h] ?? "").join(",");
  }
  const FEED_CSV = [
    FEED_HEADER.join(","),
    feedRow({
      aw_product_id: "1001",
      merchant_product_id: "SKU1",
      product_name: "Single Duvet 10.5 Tog",
      description: "Single 135x200cm hollowfibre duvet",
      aw_deep_link: "https://www.awin1.com/cread.php?x",
      merchant_deep_link: "https://www.dunelm.com/product/duvet",
      merchant_name: "Dunelm",
      merchant_id: "42",
      merchant_category: "Bedding",
      category_name: "Duvets",
      search_price: "14.00",
      store_price: "14.00",
      rrp_price: "18.00",
      currency: "GBP",
      delivery_cost: "3.95",
      in_stock: "true",
      stock_quantity: "25",
      last_updated: "2026-09-01 00:00:00",
      brand_name: "Dunelm",
      colour: "White",
    }),
    feedRow({
      aw_product_id: "1002",
      merchant_product_id: "SKU2",
      product_name: "2 Slice Toaster",
      description: "Two-slot toaster",
      merchant_name: "Argos",
      merchant_id: "7",
      merchant_category: "Kitchen",
      category_name: "Toasters",
      search_price: "10.00",
      store_price: "10.00",
      currency: "GBP",
      delivery_cost: "0",
      in_stock: "true",
    }),
    feedRow({
      aw_product_id: "1003",
      merchant_product_id: "SKU3",
      product_name: "Deluxe Duvet No Price",
      description: "Missing price row - must never be shown with a fabricated price",
      merchant_name: "Dunelm",
      merchant_id: "42",
      currency: "GBP",
    }),
  ].join("\n");

  it("downloads the configured feed(s) and maps rows, skipping unpriced rows", async () => {
    const fakeFetch: typeof fetch = async (input) => {
      const url = String(input);
      expect(url).toBe(
        `https://productdata.awin.com/datafeed/download/apikey/testkey/language/en/fid/111/columns/${FEED_HEADER.join(",")}`,
      );
      return new Response(FEED_CSV, { status: 200 });
    };
    const res = await new AwinFeedProductProvider("testkey", ["111"], fakeFetch).search({ query: "duvet" });
    expect(res).toHaveLength(1); // Toaster doesn't match "duvet"; the no-price duvet row is never fabricated.
    expect(res[0]).toMatchObject({
      provider: "awin-feed",
      retailer: "Dunelm",
      currentPrice: 14,
      previousPrice: 18,
      deliveryPrice: 3.95,
      totalPrice: 17.95,
      sourceConfidence: "verified",
      availability: "In stock (per retailer feed)",
      productUrl: "https://www.awin1.com/cread.php?x",
    });
    expect(Date.parse(res[0].checkedAt)).toBeGreaterThan(0);
  });

  it("respects maxPrice, retailerPreference and excludedAttributes", async () => {
    const fakeFetch: typeof fetch = async () => new Response(FEED_CSV, { status: 200 });
    const cheap = await new AwinFeedProductProvider("testkey", ["112"], fakeFetch).search({ query: "toaster", maxPrice: 5 });
    expect(cheap).toHaveLength(0); // Toaster is £10, over the £5 cap.
    const wrongRetailer = await new AwinFeedProductProvider("testkey", ["113"], fakeFetch).search({ query: "duvet", retailerPreference: ["Argos"] });
    expect(wrongRetailer).toHaveLength(0); // Only Dunelm sells the matching duvet in this fixture.
  });

  it("throws when the only configured feed fails", async () => {
    const bad: typeof fetch = async () => new Response("nope", { status: 500 });
    await expect(new AwinFeedProductProvider("testkey", ["114"], bad).search({ query: "duvet" })).rejects.toThrow(/500/);
  });

  it("returns partial results and logs a warning when only some feeds fail", async () => {
    const mixedFetch: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("/fid/999/")) return new Response("nope", { status: 500 });
      return new Response(FEED_CSV, { status: 200 });
    };
    const res = await new AwinFeedProductProvider("testkey", ["115", "999"], mixedFetch).search({ query: "duvet" });
    expect(res).toHaveLength(1);
    expect(res[0].retailer).toBe("Dunelm");
  });

  it.runIf(process.env.AWIN_DATAFEED_API_KEY && process.env.AWIN_FEED_IDS)("LIVE: downloads real feed(s) and searches them", async () => {
    const feedIds = (process.env.AWIN_FEED_IDS as string).split(",").map((s) => s.trim());
    const res = await new AwinFeedProductProvider(process.env.AWIN_DATAFEED_API_KEY as string, feedIds).search({ query: "the", limit: 5 });
    expect(Array.isArray(res)).toBe(true);
  });
});
