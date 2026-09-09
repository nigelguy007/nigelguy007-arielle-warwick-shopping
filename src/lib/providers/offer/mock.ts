import type { OfferResult, OfferSearchInput } from "@/lib/types";
import type { OfferProvider } from "./types";
import { offerMatchesRetailer } from "@/lib/offers/discount";
import { studentDiscountLinks } from "./student";

function daysFrom(now: Date, days: number) {
  return new Date(now.getTime() + days * 86_400_000).toISOString();
}

/** Illustrative offers only. Every result is flagged provider "mock" and unverified unless stated. */
export function mockOffers(now = new Date()): OfferResult[] {
  const checkedAt = now.toISOString();
  return [
    { id: "mock-dunelm-10", provider: "mock", retailer: "Dunelm", title: "10% off bedding (mock)", description: "Illustrative promotion", code: "MOCKBED10", type: "voucher", percentage: 10, amount: null, minSpend: 20, startDate: daysFrom(now, -3), endDate: daysFrom(now, 10), terms: "Mock offer for development. Min spend £20.", source: "mock", sourceUrl: "https://www.dunelm.com/offers", checkedAt, studentVerificationRequired: false, verified: true },
    { id: "mock-argos-5", provider: "mock", retailer: "Argos", title: "£5 off £50 (mock)", description: "Illustrative promotion", code: "MOCK5", type: "voucher", percentage: null, amount: 5, minSpend: 50, startDate: daysFrom(now, -1), endDate: daysFrom(now, 5), terms: "Mock offer for development. Min spend £50.", source: "mock", sourceUrl: "https://www.argos.co.uk/offers", checkedAt, studentVerificationRequired: false, verified: true },
    { id: "mock-ikea-expired", provider: "mock", retailer: "IKEA", title: "15% off kitchen (mock, expired)", description: "Expired illustrative promotion", code: "MOCKOLD", type: "promotion", percentage: 15, amount: null, minSpend: null, startDate: daysFrom(now, -30), endDate: daysFrom(now, -2), terms: "Expired.", source: "mock", sourceUrl: "https://www.ikea.com/gb/en/offers/", checkedAt, studentVerificationRequired: false, verified: true },
    { id: "mock-currys-unverified", provider: "mock", retailer: "Currys", title: "Possible 10% student code (mock, unverified)", description: "Reported but not verified", code: null, type: "student", percentage: 10, amount: null, minSpend: null, startDate: null, endDate: daysFrom(now, 20), terms: "Requires student verification. Not confirmed.", source: "mock", sourceUrl: "https://www.currys.co.uk/student-discount", checkedAt, studentVerificationRequired: true, verified: false },
    { id: "mock-amazon-promo", provider: "mock", retailer: "Amazon UK", title: "Student trial offer (mock, unverified)", description: "Illustrative", code: null, type: "student", percentage: null, amount: null, minSpend: null, startDate: null, endDate: null, terms: "Requires verification.", source: "mock", sourceUrl: "https://www.amazon.co.uk/student", checkedAt, studentVerificationRequired: true, verified: false },
  ];
}

export class MockOfferProvider implements OfferProvider {
  readonly name = "mock";
  constructor(private readonly now: () => Date = () => new Date()) {}

  async searchOffers(input: OfferSearchInput): Promise<OfferResult[]> {
    const now = this.now();
    let offers = mockOffers(now);
    if (input.retailer) {
      offers = offers.filter((o) => offerMatchesRetailer(o, input.retailer as string));
      offers = [...offers, ...studentDiscountLinks(input.retailer, now)];
    }
    return offers.slice(0, input.limit ?? 20);
  }
}
