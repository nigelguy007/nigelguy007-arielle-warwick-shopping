import { createHash } from "node:crypto";

/**
 * Small TTL cache used for provider results. Keys must include every input that
 * changes the result (query, location, constraints). Never put private user
 * data in here - it is shared across users on the same server instance.
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
