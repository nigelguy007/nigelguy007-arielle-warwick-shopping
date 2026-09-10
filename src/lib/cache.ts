import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { log } from "@/lib/logger";
import { getSharedCacheClient } from "@/lib/supabase/admin";

/**
 * Small TTL cache used for provider results. Keys must include every input that
 * changes the result (query, location, constraints). Never put private user
 * data in here - it is shared across users on the same server instance.
 *
 * This module deliberately never imports "@/lib/env" (which carries a
 * "server-only" guard): callers decide whether to persist from `env.dataMode`
 * and pass that in, so `SharedCache` - and its Supabase-mocked unit tests -
 * can be imported from plain Node/Vitest without tripping the "server-only"
 * throw that `env.ts` would otherwise cause outside a React Server context.
 */
export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  storedAt: number;
}

export function hashKey(parts: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(parts, Object.keys(parts).sort())).digest("hex").slice(0, 32);
}

export class TtlCache<T> {
  private map = new Map<string, CacheEntry<T>>();
  constructor(private readonly maxEntries = 500) {}

  get(key: string, now = Date.now()): CacheEntry<T> | null {
    const e = this.map.get(key);
    if (!e) return null;
    if (e.expiresAt <= now) {
      this.map.delete(key);
      return null;
    }
    return e;
  }

  set(key: string, value: T, ttlMs: number, now = Date.now()): CacheEntry<T> {
    if (this.map.size >= this.maxEntries) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    const entry = { value, expiresAt: now + ttlMs, storedAt: now };
    this.map.set(key, entry);
    return entry;
  }

  delete(key: string) {
    this.map.delete(key);
  }

  clear() {
    this.map.clear();
  }
}

export const TTL = {
  productSearch: 30 * 60 * 1000,
  productPrice: 45 * 60 * 1000,
  stores: 6 * 60 * 60 * 1000,
  offers: 60 * 60 * 1000,
} as const;

// Module-level singletons survive across requests within a warm server instance.
const globalCaches = globalThis as unknown as { __awCaches?: Record<string, TtlCache<unknown>> };
globalCaches.__awCaches ??= {};

export function namedCache<T>(name: string): TtlCache<T> {
  globalCaches.__awCaches![name] ??= new TtlCache<unknown>();
  return globalCaches.__awCaches![name] as TtlCache<T>;
}

export function ageLabel(checkedAt: string | number, now = Date.now()): string {
  const t = typeof checkedAt === "number" ? checkedAt : Date.parse(checkedAt);
  if (!Number.isFinite(t)) return "Checked time unknown";
  const mins = Math.max(0, Math.round((now - t) / 60000));
  if (mins < 1) return "Checked just now";
  if (mins === 1) return "Checked 1 minute ago";
  if (mins < 60) return `Checked ${mins} minutes ago`;
  const hours = Math.round(mins / 60);
  return hours === 1 ? "Checked 1 hour ago" : `Checked ${hours} hours ago`;
}

/**
 * The two Supabase cache tables from `supabase/migrations/0001_init.sql`.
 * Both have RLS enabled with zero policies for any client role - only the
 * secret-key (service role) client can reach them - so there is nothing to
 * gate at the query level beyond having that client.
 */
export type SharedCacheTable = "product_search_cache" | "offers_cache";

/** What we actually persist in the jsonb `results` column of a shared cache table. */
interface StoredPayload<T> {
  storedAt: number;
  value: T;
}

/**
 * A provider-result cache that is in-memory only in local mode, and backed by
 * a Supabase table (shared across all serverless instances) in Supabase mode.
 * Persistence is opt-in per call via `persist` so this class carries no
 * dependency on `env` itself (see the file-level note above).
 *
 * The `match` object must be exactly the columns of the table's unique
 * constraint (e.g. `{ provider, query_hash, location_key }` for
 * `product_search_cache`, `{ provider, merchant_key }` for `offers_cache`) so
 * it can double as both the lookup filter and the `upsert` conflict target.
 *
 * Caching is always best-effort: any Supabase error on read is treated as a
 * cache miss, and any Supabase error on write falls back to an in-memory
 * write for this instance, so a database hiccup never breaks a search.
 */
export class SharedCache<T> {
  private readonly memory: TtlCache<T>;

  constructor(
    memoryName: string,
    private readonly table: SharedCacheTable,
    private readonly getClient: () => SupabaseClient = getSharedCacheClient,
  ) {
    this.memory = namedCache<T>(memoryName);
  }

  async get(opts: { persist: boolean; match: Record<string, string>; memoryKey: string; now?: number }): Promise<CacheEntry<T> | null> {
    const now = opts.now ?? Date.now();
    if (!opts.persist) return this.memory.get(opts.memoryKey, now);
    try {
      const { data, error } = await this.getClient().from(this.table).select("results, expires_at").match(opts.match).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      const expiresAt = Date.parse(String((data as { expires_at: string }).expires_at));
      if (!Number.isFinite(expiresAt) || expiresAt <= now) return null;
      const payload = (data as { results: StoredPayload<T> }).results;
      if (!payload || typeof payload.storedAt !== "number") return null;
      return { value: payload.value, storedAt: payload.storedAt, expiresAt };
    } catch (err) {
      log.warn("cache.shared_read_failed", { table: this.table, error: err instanceof Error ? err.message : String(err) });
      return null;
    }
  }

  async set(opts: { persist: boolean; match: Record<string, string>; memoryKey: string; value: T; ttlMs: number; now?: number }): Promise<CacheEntry<T>> {
    const now = opts.now ?? Date.now();
    const entry: CacheEntry<T> = { value: opts.value, storedAt: now, expiresAt: now + opts.ttlMs };
    if (!opts.persist) {
      this.memory.set(opts.memoryKey, opts.value, opts.ttlMs, now);
      return entry;
    }
    try {
      const payload: StoredPayload<T> = { storedAt: now, value: opts.value };
      const row = { ...opts.match, results: payload, expires_at: new Date(entry.expiresAt).toISOString() };
      const { error } = await this.getClient()
        .from(this.table)
        .upsert(row, { onConflict: Object.keys(opts.match).join(",") });
      if (error) throw new Error(error.message);
    } catch (err) {
      log.warn("cache.shared_write_failed", { table: this.table, error: err instanceof Error ? err.message : String(err) });
      // Best-effort: at least this instance benefits until the database is reachable again.
      this.memory.set(opts.memoryKey, opts.value, opts.ttlMs, now);
    }
    return entry;
  }
}
