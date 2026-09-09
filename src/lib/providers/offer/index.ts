import "server-only";
import { env } from "@/lib/env";
import { hashKey, namedCache, TTL } from "@/lib/cache";
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
  const cache = namedCache<OfferResult[]>("offers");
  const key = hashKey({ provider: provider.name, retailer: input.retailer?.toLowerCase() ?? null, q: input.query?.toLowerCase() ?? null, region: input.region ?? "GB" });
  const now = new Date();
  if (!opts.refresh) {
    const hit = cache.get(key);
    if (hit) return { offers: filterActiveOffers(hit.value, now), provider: provider.name, checkedAt: new Date(hit.storedAt).toISOString(), fromCache: true, mock };
  }
  try {
    const offers = await provider.searchOffers(input);
    // Cache no longer than the soonest expiry.
    const soonest = offers.map((o) => (o.endDate ? Date.parse(o.endDate) - now.getTime() : Infinity)).reduce((a, b) => Math.min(a, b), TTL.offers);
    cache.set(key, offers, Math.max(60_000, Math.min(TTL.offers, soonest)));
    return { offers: filterActiveOffers(offers, now), provider: provider.name, checkedAt: now.toISOString(), fromCache: false, mock };
  } catch {
    return { offers: [], provider: provider.name, checkedAt: now.toISOString(), fromCache: false, mock };
  }
}
