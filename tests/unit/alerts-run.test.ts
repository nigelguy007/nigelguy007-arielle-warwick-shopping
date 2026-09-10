import { describe, expect, it, vi } from "vitest";
import { runAlertsForAllUsers, runAlertsForUser, type AlertDeps } from "@/lib/alerts/run";
import type { Notifier } from "@/lib/notify/types";
import type { PriceWatch } from "@/lib/types";
import { basketLine, offer, product, NOW } from "./fixtures";

function fakeStore(watches: Record<string, PriceWatch> = {}) {
  const recorded: Array<{ userId: string; itemKey: string; patch: unknown }> = [];
  return {
    listBasket: vi.fn(async () => [basketLine(product({ id: "p1", retailer: "Argos", title: "Kettle", totalPrice: 20 }), 1, "b1")]),
    getUserChecklistItem: vi.fn(async () => null),
    getPriceWatch: vi.fn(async (_userId: string, itemKey: string) => watches[itemKey] ?? null),
    recordPriceObservation: vi.fn(async (userId: string, itemKey: string, patch: { label: string; retailer: string; price: number; currency: string; productUrl: string | null }) => {
      recorded.push({ userId, itemKey, patch });
      return { id: "w", userId, itemKey, label: patch.label, retailer: patch.retailer, lastPrice: patch.price, currency: patch.currency, productUrl: patch.productUrl, lastCheckedAt: NOW.toISOString() };
    }),
    recorded,
  };
}

function fakeNotifier(): Notifier & { calls: unknown[] } {
  const calls: unknown[] = [];
  return {
    name: "fake",
    calls,
    send: vi.fn(async (target, notifications) => {
      calls.push({ target, notifications });
      return { channel: "fake", sent: notifications.length > 0 };
    }),
  };
}

describe("runAlertsForUser", () => {
  it("seeds a baseline on first sighting and notifies no drop", async () => {
    const store = fakeStore();
    const notifier = fakeNotifier();
    const deps: AlertDeps = {
      store,
      notifier,
      searchProducts: async () => ({ results: [product({ id: "p1", retailer: "Argos", title: "Kettle", totalPrice: 20 })] }),
      searchOffers: async () => ({ offers: [] }),
    };
    const summary = await runAlertsForUser("u1", "u1@example.com", deps);
    expect(summary).toMatchObject({ userId: "u1", priceDropsFound: 0, vouchersExpiringFound: 0, notified: false, errors: [] });
    expect(store.recordPriceObservation).toHaveBeenCalledWith("u1", "basket:b1", { label: "Kettle", retailer: "Argos", price: 20, currency: "GBP", productUrl: "https://example.com" });
    expect(notifier.send).not.toHaveBeenCalled();
  });

  it("reports a genuine drop against the previously recorded price and updates the watch", async () => {
    const store = fakeStore({ "basket:b1": { id: "w0", userId: "u1", itemKey: "basket:b1", label: "Kettle", retailer: "Argos", lastPrice: 20, currency: "GBP", productUrl: null, lastCheckedAt: NOW.toISOString() } });
    const notifier = fakeNotifier();
    const deps: AlertDeps = {
      store,
      notifier,
      searchProducts: async () => ({ results: [product({ id: "p1", retailer: "Argos", title: "Kettle", totalPrice: 15 })] }),
      searchOffers: async () => ({ offers: [] }),
    };
    const summary = await runAlertsForUser("u1", "u1@example.com", deps);
    expect(summary.priceDropsFound).toBe(1);
    expect(summary.notified).toBe(true);
    expect(notifier.calls).toHaveLength(1);
    expect(store.recorded[0].patch).toMatchObject({ price: 15 });
  });

  it("does not report a drop when the fresh results don't confidently match the tracked product", async () => {
    const store = fakeStore({ "basket:b1": { id: "w0", userId: "u1", itemKey: "basket:b1", label: "Kettle", retailer: "Argos", lastPrice: 20, currency: "GBP", productUrl: null, lastCheckedAt: NOW.toISOString() } });
    const notifier = fakeNotifier();
    const deps: AlertDeps = {
      store,
      notifier,
      searchProducts: async () => ({ results: [product({ id: "different", retailer: "Currys", title: "Unrelated Toaster", totalPrice: 5 })] }),
      searchOffers: async () => ({ offers: [] }),
    };
    const summary = await runAlertsForUser("u1", "u1@example.com", deps);
    expect(summary.priceDropsFound).toBe(0);
    expect(store.recordPriceObservation).not.toHaveBeenCalled(); // nothing confidently matched, so nothing was overwritten
  });

  it("surfaces a nearing-expiry voucher for a retailer in the basket", async () => {
    const store = fakeStore();
    const notifier = fakeNotifier();
    const deps: AlertDeps = {
      store,
      notifier,
      searchProducts: async () => ({ results: [product({ id: "p1", retailer: "Argos", title: "Kettle", totalPrice: 20 })] }),
      searchOffers: async () => ({ offers: [offer({ retailer: "Argos", endDate: new Date(NOW.getTime() + 86_400_000).toISOString() })] }),
      now: NOW,
    };
    const summary = await runAlertsForUser("u1", "u1@example.com", deps);
    expect(summary.vouchersExpiringFound).toBe(1);
    expect(summary.notified).toBe(true);
  });

  it("keeps going and records the error when a provider call fails, instead of crashing the whole run", async () => {
    const store = fakeStore();
    const notifier = fakeNotifier();
    const deps: AlertDeps = {
      store,
      notifier,
      searchProducts: async () => {
        throw new Error("provider down");
      },
      searchOffers: async () => ({ offers: [] }),
    };
    const summary = await runAlertsForUser("u1", "u1@example.com", deps);
    expect(summary.errors).toHaveLength(1);
    expect(summary.priceDropsFound).toBe(0);
  });
});

describe("runAlertsForAllUsers", () => {
  it("sweeps every user id and totals the results", async () => {
    // One store instance services every user, same as the real admin store: each
    // DataStore method takes an explicit userId rather than being pre-scoped to one.
    const store = fakeStore();
    const notifier = fakeNotifier();
    const summary = await runAlertsForAllUsers({
      store,
      notifier,
      listUserIds: async () => ["u1", "u2"],
      resolveEmail: async (userId) => `${userId}@example.com`,
      searchProducts: async () => ({ results: [] }),
      searchOffers: async () => ({ offers: [] }),
    });
    expect(summary.usersProcessed).toBe(2);
    expect(summary.users.map((u) => u.userId)).toEqual(["u1", "u2"]);
    expect(summary.totalPriceDrops).toBe(0);
    expect(summary.totalNotified).toBe(0);
    expect(Date.parse(summary.ranAt)).toBeGreaterThan(0);
  });
});
