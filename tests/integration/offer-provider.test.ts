import { describe, expect, it } from "vitest";
import { MockOfferProvider } from "@/lib/providers/offer/mock";
import { AwinOfferProvider } from "@/lib/providers/offer/awin";
import { studentDiscountLinks } from "@/lib/providers/offer/student";
import { filterActiveOffers } from "@/lib/offers/expiry";

describe("MockOfferProvider", () => {
  it("returns offers with source, expiry and terms, plus student deep links", async () => {
    const offers = await new MockOfferProvider().searchOffers({ retailer: "Dunelm" });
    expect(offers.some((o) => o.retailer === "Dunelm" && o.terms)).toBe(true);
    const student = offers.filter((o) => o.type === "student");
    expect(student.length).toBeGreaterThanOrEqual(2);
    expect(student.every((o) => !o.verified && o.studentVerificationRequired)).toBe(true);
  });
  it("includes an expired offer that expiry filtering removes", async () => {
    const all = await new MockOfferProvider().searchOffers({});
    expect(all.some((o) => o.id === "mock-ikea-expired")).toBe(true);
    expect(filterActiveOffers(all).some((o) => o.id === "mock-ikea-expired")).toBe(false);
  });
});

describe("student links", () => {
  it("never claim verification", () => {
    for (const l of studentDiscountLinks("Currys")) {
      expect(l.verified).toBe(false);
      expect(l.studentVerificationRequired).toBe(true);
      expect(l.sourceUrl).toMatch(/^https:\/\//);
    }
  });
});

describe("AwinOfferProvider (mocked HTTP)", () => {
  const fakeFetch: typeof fetch = async (input, init) => {
    expect(String(input)).toBe("https://api.awin.com/publishers/123/promotions");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer tok");
    const body = JSON.parse(String(init?.body));
    expect(body.filters.regionCodes).toEqual(["GB"]);
    return new Response(JSON.stringify({ data: [{ promotionId: 9, advertiser: { name: "Dunelm" }, title: "15% off bedding over £30", description: "", terms: "Excludes sale", type: "voucher", voucher: { code: "BED15" }, startDate: "2026-09-01T00:00:00Z", endDate: "2026-12-31T00:00:00Z", urlTracking: "https://awin1.com/x" }] }));
  };
  it("maps promotions and parses percentage + min spend", async () => {
    const offers = await new AwinOfferProvider("123", "tok", fakeFetch).searchOffers({ retailer: "Dunelm" });
    const promo = offers.find((o) => o.provider === "awin")!;
    expect(promo).toMatchObject({ retailer: "Dunelm", code: "BED15", percentage: 15, minSpend: 30, type: "voucher", verified: true, endDate: "2026-12-31T00:00:00Z" });
    expect(offers.some((o) => o.type === "student")).toBe(true);
  });
  it.runIf(process.env.AWIN_PUBLISHER_ID && process.env.AWIN_ACCESS_TOKEN)("LIVE: fetches UK promotions", async () => {
    const offers = await new AwinOfferProvider(process.env.AWIN_PUBLISHER_ID as string, process.env.AWIN_ACCESS_TOKEN as string).searchOffers({ limit: 5 });
    expect(Array.isArray(offers)).toBe(true);
  });
});
