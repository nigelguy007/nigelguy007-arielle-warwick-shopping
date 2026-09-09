import "server-only";
import { env } from "@/lib/env";
import { hashKey, namedCache, TTL } from "@/lib/cache";
import type { StoreResult } from "@/lib/types";
import { GoogleMapProvider } from "./google";
import { MockMapProvider } from "./mock";
import type { MapProvider, NearbyStoresInput } from "./types";

export function getMapProvider(): MapProvider {
  if (env.mapProvider === "google") return new GoogleMapProvider(env.googleServerKey, env.routesEnabled);
  return new MockMapProvider();
}

export interface NearbyStoresResponse {
  stores: StoreResult[];
  provider: string;
  checkedAt: string;
  fromCache: boolean;
  mock: boolean;
}

export async function nearbyStores(input: NearbyStoresInput, opts: { refresh?: boolean } = {}): Promise<NearbyStoresResponse> {
  const provider = getMapProvider();
  const mock = provider.name === "mock";
  const cache = namedCache<StoreResult[]>("stores");
  // Round coordinates to ~100m so nearby users share a cache entry without storing precise location.
  const key = hashKey({
    provider: provider.name,
    lat: Math.round(input.center.lat * 1000) / 1000,
    lng: Math.round(input.center.lng * 1000) / 1000,
    r: input.radiusMeters ?? null,
    cats: input.categories ?? [],
    retailer: input.retailer?.toLowerCase() ?? null,
    limit: input.limit ?? null,
  });
  if (!opts.refresh) {
    const hit = cache.get(key);
    if (hit) return { stores: hit.value, provider: provider.name, checkedAt: new Date(hit.storedAt).toISOString(), fromCache: true, mock };
  }
  const stores = await provider.searchNearby(input);
  cache.set(key, stores, TTL.stores);
  return { stores, provider: provider.name, checkedAt: new Date().toISOString(), fromCache: false, mock };
}

export async function geocodePostcode(postcode: string) {
  return getMapProvider().geocodePostcode(postcode);
}
