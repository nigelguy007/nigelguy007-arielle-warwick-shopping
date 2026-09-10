import "server-only";
import { env } from "@/lib/env";
import { hashKey, SharedCache, TTL } from "@/lib/cache";
import { filterActiveOffers } from "@/lib/offers/expiry";
import type { OfferResult, OfferSearchInput } from "@/lib/types";
import { AwinOfferProvider } from "./awin";
import { MockOfferProvider } from "./mock";
import type { OfferProvider } from "./types";

export function getOfferProvider(): OfferProvider {
  if (env.offerProvider === "awin") return new AwinOfferProvider(env.awin.publisherId, env.awin.accessToken);
  return new MockOfferProvider();
}

export interface OffersResponse {
  offers: OfferResult[];
  provider: string;
  checkedAt: string;
  fromCache: boolean;
  mock: boolean;
}

export async function searchOffers(input: OfferSearchInput, opts: { refresh?: boolean } = {}): Promise<OffersResponse> {
  const provider = getOfferProvider();
  const mock = provider.name === "mock";
  const cache = new SharedCache<OfferResult[]>("offers", "offers_cache");
  const persist = env.dataMode === "supabase";
  // `match` doubles as the Supabase lookup filter and upsert conflict target,
  // so its keys must be exactly offers_cache's unique columns.
  const match = {
    provider: provider.name,
    merchant_key: hashKey({ retailer: input.retailer?.toLowerCase() ?? null, q: input.query?.toLowerCase() ?? null, region: input.region ?? "GB" }),
  };
  const memoryKey = hashKey(match);
  const now = new Date();
  if (!opts.refresh) {
    const hit = await cache.get({ persist, match, memoryKey });
    if (hit) return { offers: filterActiveOffers(hit.value, now), provider: provider.name, checkedAt: new Date(hit.storedAt).toISOString(), fromCache: true, mock };
  }
  try {
    const offers = await provider.searchOffers(input);
    // Cache no longer than the soonest expiry.
    const soonest = offers.map((o) => (o.endDate ? Date.parse(o.endDate) - now.getTime() : Infinity)).reduce((a, b) => Math.min(a, b), TTL.offers);
    await cache.set({ persist, match, memoryKey, value: offers, ttlMs: Math.max(60_000, Math.min(TTL.offers, soonest)) });
    return { offers: filterActiveOffers(offers, now), provider: provider.name, checkedAt: now.toISOString(), fromCache: false, mock };
  } catch {
    return { offers: [], provider: provider.name, checkedAt: now.toISOString(), fromCache: false, mock };
  }
}
