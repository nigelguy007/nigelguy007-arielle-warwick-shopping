import type { OfferResult } from "@/lib/types";

/**
 * Student-discount sources are never scraped and verification is never bypassed.
 * Without an approved partner integration we only produce "Check student discount"
 * deep links that are explicitly unverified.
 */
export function studentDiscountLinks(retailer: string, now = new Date()): OfferResult[] {
  const q = encodeURIComponent(retailer);
  const checkedAt = now.toISOString();
  const base = {
    retailer,
    title: "Check student discount",
    description: `See whether ${retailer} currently offers a verified student discount.`,
    code: null,
    type: "student" as const,
    percentage: null,
    amount: null,
    minSpend: null,
    startDate: null,
    endDate: null,
    terms: "Student status must be verified with the provider. Availability and percentage are not confirmed by this app.",
    checkedAt,
    studentVerificationRequired: true,
    verified: false,
  };
  return [
    { ...base, id: `student-beans-${q}`, provider: "student-beans-link", source: "Student Beans (public search)", sourceUrl: `https://www.studentbeans.com/uk/search?q=${q}` },
    { ...base, id: `unidays-${q}`, provider: "unidays-link", source: "UNiDAYS (public search)", sourceUrl: `https://www.myunidays.com/GB/en-GB/search?q=${q}` },
  ];
}
