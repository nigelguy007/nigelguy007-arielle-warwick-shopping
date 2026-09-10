import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// route.ts pulls in "server-only"-tainted modules (env, the store, the providers,
// the notifier). Each is mocked below so the module graph never touches the real
// "server-only" package, while `@/lib/alerts/run` (the actual orchestration logic)
// runs for real - this exercises the real route wiring, not just a trivial stub.

const mockEnv = vi.hoisted(() => ({
  cronSecret: "test-secret",
  isProduction: false,
  priceDropAlertMin: 0.5,
  voucherExpiryAlertDays: 3,
}));
vi.mock("@/lib/env", () => ({ env: mockEnv }));

const watches = vi.hoisted(() => new Map<string, { label: string; retailer: string; price: number; currency: string; productUrl: string | null }>());

const fakeStore = vi.hoisted(() => ({
  listProfileUserIds: vi.fn(async () => ["user-1"]),
  listBasket: vi.fn(async () => [
    {
      id: "b1",
      userId: "user-1",
      checklistItemId: null,
      quantity: 1,
      addedAt: "2026-01-01T00:00:00Z",
      productSnapshot: {
        id: "p1",
        provider: "mock",
        retailer: "Argos",
        title: "Kettle",
        description: "",
        currentPrice: 20,
        currency: "GBP",
        totalPrice: 20,
        imageUrl: null,
        productUrl: "https://example.com/kettle",
        merchantUrl: null,
        availability: "in stock",
        attributes: [],
        locationContext: "UK",
        checkedAt: "2026-01-01T00:00:00Z",
        sourceConfidence: "mock",
      },
    },
  ]),
  getUserChecklistItem: vi.fn(async () => null),
  getPriceWatch: vi.fn(async (_userId: string, itemKey: string) => (watches.has(itemKey) ? { id: "w1", userId: "user-1", itemKey, ...watches.get(itemKey)!, lastPrice: watches.get(itemKey)!.price, lastCheckedAt: "2026-01-01T00:00:00Z" } : null)),
  recordPriceObservation: vi.fn(async (_userId: string, itemKey: string, patch: { label: string; retailer: string; price: number; currency: string; productUrl: string | null }) => {
    watches.set(itemKey, patch);
    return { id: "w1", userId: "user-1", itemKey, ...patch, lastPrice: patch.price, lastCheckedAt: new Date().toISOString() };
  }),
}));
vi.mock("@/lib/store", () => ({ getAdminStore: vi.fn(async () => fakeStore) }));

const freshSearchResult = vi.hoisted(() => ({ price: 15 }));
vi.mock("@/lib/providers/product", () => ({
  searchProducts: vi.fn(async () => ({
    results: [{ id: "p1", provider: "mock", retailer: "Argos", title: "Kettle", description: "", currentPrice: freshSearchResult.price, currency: "GBP", totalPrice: freshSearchResult.price, imageUrl: null, productUrl: "https://example.com/kettle", merchantUrl: null, availability: "in stock", attributes: [], locationContext: "UK", checkedAt: "2026-01-02T00:00:00Z", sourceConfidence: "mock" }],
  })),
}));

vi.mock("@/lib/providers/offer", () => ({
  searchOffers: vi.fn(async () => ({
    offers: [
      {
        id: "o1",
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
        endDate: new Date(Date.now() + 2 * 86_400_000).toISOString(),
        terms: "",
        source: "test",
        sourceUrl: "https://example.com",
        checkedAt: new Date().toISOString(),
        studentVerificationRequired: false,
        verified: true,
      },
    ],
  })),
}));

const fakeNotifier = vi.hoisted(() => ({ name: "fake", send: vi.fn(async () => ({ channel: "fake", sent: true })) }));
vi.mock("@/lib/notify", () => ({ getNotifier: vi.fn(() => fakeNotifier) }));

vi.mock("@/lib/alerts/resolve-email", () => ({ resolveUserEmail: vi.fn(async () => null) }));

const { GET } = await import("@/app/api/alerts/run/route");

function makeRequest(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/alerts/run", { headers });
}

beforeEach(() => {
  mockEnv.cronSecret = "test-secret";
  mockEnv.isProduction = false;
  watches.clear();
  fakeNotifier.send.mockClear();
  freshSearchResult.price = 15;
});
afterEach(() => vi.clearAllMocks());

describe("GET /api/alerts/run", () => {
  it("rejects a request with a wrong or missing secret", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    expect(fakeNotifier.send).not.toHaveBeenCalled();
  });

  it("refuses to run unauthenticated once real user data is in play (production, no secret set)", async () => {
    mockEnv.cronSecret = "";
    mockEnv.isProduction = true;
    const res = await GET(makeRequest());
    expect(res.status).toBe(503);
  });

  it("seeds a baseline on first sighting without claiming a price drop", async () => {
    const res = await GET(makeRequest({ authorization: "Bearer test-secret" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.usersProcessed).toBe(1);
    expect(body.totalPriceDrops).toBe(0); // no prior watch recorded yet
    expect(body.totalVouchersExpiring).toBe(1); // the mock voucher is genuinely 2 days out
  });

  it("detects a real price drop against the previously recorded price and notifies", async () => {
    watches.set("basket:b1", { label: "Kettle", retailer: "Argos", price: 20, currency: "GBP", productUrl: "https://example.com/kettle" });
    const res = await GET(makeRequest({ authorization: "Bearer test-secret" }));
    const body = await res.json();
    expect(body.totalPriceDrops).toBe(1);
    expect(body.totalNotified).toBe(1);
    expect(fakeNotifier.send).toHaveBeenCalledTimes(1);
    const [, notifications] = fakeNotifier.send.mock.calls[0] as unknown as [unknown, Array<{ kind: string }>];
    expect(notifications.some((n) => n.kind === "price_drop")).toBe(true);
  });

  it("does not report a drop when the price has not actually fallen", async () => {
    watches.set("basket:b1", { label: "Kettle", retailer: "Argos", price: 15, currency: "GBP", productUrl: "https://example.com/kettle" });
    freshSearchResult.price = 15;
    const res = await GET(makeRequest({ authorization: "Bearer test-secret" }));
    const body = await res.json();
    expect(body.totalPriceDrops).toBe(0);
  });
});
