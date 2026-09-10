import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SharedCache, TtlCache, ageLabel, hashKey } from "@/lib/cache";

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

/** Minimal fake of the `SupabaseClient` chain SharedCache uses, backed by an in-memory row map. */
function fakeSupabase(opts: { failSelect?: boolean; failUpsert?: boolean } = {}) {
  const rows = new Map<string, { results: unknown; expires_at: string }>();
  const rowKey = (match: Record<string, string>) =>
    Object.keys(match)
      .sort()
      .map((k) => `${k}=${match[k]}`)
      .join("&");

  const select = vi.fn(() => ({
    match: (match: Record<string, string>) => ({
      maybeSingle: async () => {
        if (opts.failSelect) return { data: null, error: { message: "boom" } };
        return { data: rows.get(rowKey(match)) ?? null, error: null };
      },
    }),
  }));
  const upsert = vi.fn(async (row: Record<string, unknown>, upsertOpts: { onConflict: string }) => {
    if (opts.failUpsert) return { error: { message: "boom" } };
    const cols = upsertOpts.onConflict.split(",");
    const match: Record<string, string> = {};
    for (const c of cols) match[c] = String(row[c]);
    rows.set(rowKey(match), { results: row.results, expires_at: row.expires_at as string });
    return { error: null };
  });
  const from = vi.fn(() => ({ select, upsert }));
  return { client: { from } as unknown as SupabaseClient, rows, select, upsert };
}

describe("SharedCache", () => {
  it("persist:false behaves like the in-memory TtlCache and never touches Supabase", async () => {
    const { client, select, upsert } = fakeSupabase();
    const cache = new SharedCache<number>("shared-test-memory", "product_search_cache", () => client);
    await cache.set({ persist: false, match: { provider: "mock" }, memoryKey: "k1", value: 42, ttlMs: 1000, now: 0 });
    expect(await cache.get({ persist: false, match: { provider: "mock" }, memoryKey: "k1", now: 500 })).toMatchObject({ value: 42, storedAt: 0 });
    expect(await cache.get({ persist: false, match: { provider: "mock" }, memoryKey: "k1", now: 1001 })).toBeNull();
    expect(select).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("persist:true round-trips through the Supabase table and reflects the correct TTL semantics", async () => {
    const { client, upsert } = fakeSupabase();
    const cache = new SharedCache<{ price: number }>("shared-test-product", "product_search_cache", () => client);
    const match = { provider: "serpapi", query_hash: "abc", location_key: "CV4" };

    await cache.set({ persist: true, match, memoryKey: "unused", value: { price: 10 }, ttlMs: 30 * 60 * 1000, now: 1_000_000 });
    expect(upsert).toHaveBeenCalledTimes(1);
    const [row, upsertOpts] = upsert.mock.calls[0];
    expect(upsertOpts).toEqual({ onConflict: "provider,query_hash,location_key" });
    expect(row).toMatchObject({ provider: "serpapi", query_hash: "abc", location_key: "CV4", results: { storedAt: 1_000_000, value: { price: 10 } } });

    // Within TTL: hit, with the original storedAt preserved.
    const hit = await cache.get({ persist: true, match, memoryKey: "unused", now: 1_000_000 + 60_000 });
    expect(hit).toEqual({ value: { price: 10 }, storedAt: 1_000_000, expiresAt: 1_000_000 + 30 * 60 * 1000 });

    // Past expiry: miss.
    const expired = await cache.get({ persist: true, match, memoryKey: "unused", now: 1_000_000 + 31 * 60 * 1000 });
    expect(expired).toBeNull();

    // A different match (e.g. a different provider) never sees this row.
    const other = await cache.get({ persist: true, match: { ...match, provider: "mock" }, memoryKey: "unused", now: 1_000_000 });
    expect(other).toBeNull();
  });

  it("offers_cache uses its own (provider, merchant_key) conflict target", async () => {
    const { client, upsert } = fakeSupabase();
    const cache = new SharedCache<string[]>("shared-test-offers", "offers_cache", () => client);
    const match = { provider: "awin", merchant_key: "xyz" };
    await cache.set({ persist: true, match, memoryKey: "unused", value: ["10% off"], ttlMs: 60_000, now: 0 });
    expect(upsert.mock.calls[0][1]).toEqual({ onConflict: "provider,merchant_key" });
    expect(await cache.get({ persist: true, match, memoryKey: "unused", now: 1000 })).toMatchObject({ value: ["10% off"] });
  });

  it("degrades to a cache miss (never throws) when the Supabase read fails", async () => {
    const { client } = fakeSupabase({ failSelect: true });
    const cache = new SharedCache<number>("shared-test-fail-read", "offers_cache", () => client);
    await expect(cache.get({ persist: true, match: { provider: "awin", merchant_key: "x" }, memoryKey: "unused" })).resolves.toBeNull();
  });

  it("falls back to an in-memory write (and never throws) when the Supabase write fails", async () => {
    const { client, upsert } = fakeSupabase({ failUpsert: true });
    const cache = new SharedCache<number>("shared-test-fail-write", "offers_cache", () => client);
    const match = { provider: "awin", merchant_key: "x" };
    await expect(cache.set({ persist: true, match, memoryKey: "fallback-key", value: 7, ttlMs: 60_000, now: 0 })).resolves.toMatchObject({ value: 7 });
    expect(upsert).toHaveBeenCalledTimes(1);
    // The failed persist falls back to the local memory cache under memoryKey.
    expect(await cache.get({ persist: false, match, memoryKey: "fallback-key", now: 100 })).toMatchObject({ value: 7 });
  });

  it("supports the refresh=1 bypass pattern used by callers: skip get(), still set()", async () => {
    const { client, select } = fakeSupabase();
    const cache = new SharedCache<number>("shared-test-refresh", "product_search_cache", () => client);
    const match = { provider: "serpapi", query_hash: "abc", location_key: "uk" };
    await cache.set({ persist: true, match, memoryKey: "unused", value: 1, ttlMs: 60_000, now: 0 });
    // A caller bypassing the cache (refresh=1) simply never calls get(); confirm a fresh set() still overwrites cleanly.
    await cache.set({ persist: true, match, memoryKey: "unused", value: 2, ttlMs: 60_000, now: 10 });
    expect(select).not.toHaveBeenCalled();
    expect(await cache.get({ persist: true, match, memoryKey: "unused", now: 20 })).toMatchObject({ value: 2, storedAt: 10 });
  });
});
