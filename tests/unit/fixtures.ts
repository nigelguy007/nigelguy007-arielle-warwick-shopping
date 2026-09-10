import type { AccommodationProfile, BasketItem, ChecklistView, OfferResult, ProductSearchResult, Purchase, StoreResult } from "@/lib/types";

export const NOW = new Date("2026-09-09T12:00:00Z");

export function product(overrides: Partial<ProductSearchResult> = {}): ProductSearchResult {
  return {
    id: overrides.id ?? `p-${Math.random().toString(36).slice(2, 8)}`,
    provider: "mock",
    retailer: "Argos",
    title: "Thing",
    description: "",
    currentPrice: 10,
    currency: "GBP",
    deliveryPrice: 0,
    totalPrice: 10,
    imageUrl: null,
    productUrl: "https://example.com",
    merchantUrl: null,
    availability: "in stock online",
    attributes: [],
    locationContext: "UK",
    checkedAt: NOW.toISOString(),
    sourceConfidence: "mock",
    ...overrides,
  };
}

export function profile(overrides: Partial<AccommodationProfile> = {}): AccommodationProfile {
  return {
    id: "acc-1",
    slug: "test-hall",
    name: "Test Hall",
    officialUrl: "https://warwick.ac.uk/",
    verifiedAt: NOW.toISOString(),
    bedSize: "single",
    mattressDimensions: "90x190",
    ensuite: true,
    sharedBathroom: false,
    kitchenType: "shared",
    hobType: "induction",
    suppliedAppliances: ["Kettle", "Microwave", "Toaster"],
    prohibitedItems: ["candles"],
    notes: {},
    ...overrides,
  };
}

export function item(overrides: Partial<ChecklistView> = {}): ChecklistView {
  return {
    id: overrides.id ?? `i-${Math.random().toString(36).slice(2, 8)}`,
    sourceKey: "kitchen/thing",
    category: "Kitchen",
    item: "Thing",
    priority: "essential",
    timing: "buy_before",
    defaultQty: 1,
    budgetEstimate: 10,
    notes: "",
    status: "buy",
    qty: 1,
    customNotes: "",
    box: "",
    updatedAt: null,
    ...overrides,
  };
}

export function offer(overrides: Partial<OfferResult> = {}): OfferResult {
  return {
    id: overrides.id ?? `o-${Math.random().toString(36).slice(2, 8)}`,
    provider: "mock",
    retailer: "Argos",
    title: "10% off",
    description: "",
    code: "TEN",
    type: "voucher",
    percentage: 10,
    amount: null,
    minSpend: null,
    startDate: null,
    endDate: null,
    terms: "",
    source: "test",
    sourceUrl: "https://example.com",
    checkedAt: NOW.toISOString(),
    studentVerificationRequired: false,
    verified: true,
    ...overrides,
  };
}

export function basketLine(p: ProductSearchResult, quantity = 1, id?: string): BasketItem {
  return { id: id ?? `b-${p.id}`, userId: "u", checklistItemId: null, productSnapshot: p, quantity, addedAt: NOW.toISOString() };
}

export function purchase(overrides: Partial<Purchase> = {}): Purchase {
  return {
    id: overrides.id ?? `pu-${Math.random().toString(36).slice(2, 8)}`,
    userId: "u",
    checklistItemId: null,
    productSnapshot: null,
    retailer: "Argos",
    paidPrice: 10,
    voucherUsed: null,
    purchasedAt: NOW.toISOString(),
    receiptImage: null,
    ...overrides,
  };
}

export function store(overrides: Partial<StoreResult> = {}): StoreResult {
  return {
    id: overrides.id ?? `s-${Math.random().toString(36).slice(2, 8)}`,
    provider: "mock",
    name: "Argos Coventry",
    address: "Coventry",
    location: { lat: 52.4, lng: -1.5 },
    distanceMeters: 2000,
    openNow: true,
    openingHours: null,
    rating: 4,
    reviewCount: 10,
    category: "home_goods",
    retailerKey: "Argos",
    googleMapsUrl: "https://maps.google.com",
    travelTimeMinutes: null,
    checkedAt: NOW.toISOString(),
    sourceConfidence: "mock",
    ...overrides,
  };
}
