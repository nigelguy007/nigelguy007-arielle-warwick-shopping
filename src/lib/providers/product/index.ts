import "server-only";
import { env } from "@/lib/env";
import { hashKey, SharedCache, TTL } from "@/lib/cache";
import type { ProductSearchInput, ProductSearchResult } from "@/lib/types";
import { MockProductProvider } from "./mock";
import { SerpApiProductProvider } from "./serpapi";
import type { ProductSearchProvider } from "./types";

export function getProductProvider(): ProductSearchProvider {
  if (env.productProvider === "serpapi") return new SerpApiProductProvider(env.serpapiKey);
  return new MockProductProvider();
}

export interface ProductSearchResponse {
  results: ProductSearchResult[];
  provider: string;
  checkedAt: string;
  fromCache: boolean;
  mock: boolean;
}

export class ProviderUnavailableError extends Error {
  constructor(message = "I can't check live prices right now. Your checklist is safe. Try the price search again.") {
    super(message);
    this.name = "ProviderUnavailableError";
  }
}

export async function searchProducts(input: ProductSearchInput, opts: { refresh?: boolean } = {}): Promise<ProductSearchResponse> {
  const provider = getProductProvider();
  const mock = provider.name === "mock";
  if (mock && env.isProduction) {
    // Production must never present mock prices as live.
    throw new ProviderUnavailableError("Live price search isn't set up yet. Ask Nigel to add a product provider key.");
  }
  const cache = new SharedCache<ProductSearchResult[]>("product-search", "product_search_cache");
  const persist = env.dataMode === "supabase";
  // `match` doubles as the Supabase lookup filter and upsert conflict target,
  // so its keys must be exactly product_search_cache's unique columns.
  const match = {
    provider: provider.name,
    location_key: input.location?.postcode ?? input.location?.label ?? "uk",
    query_hash: hashKey({
      q: input.query.trim().toLowerCase(),
      max: input.maxPrice ?? null,
      req: input.requiredAttributes ?? [],
      exc: input.excludedAttributes ?? [],
      ret: input.retailerPreference ?? [],
      online: input.onlineOnly ?? false,
      limit: input.limit ?? null,
    }),
  };
  const memoryKey = hashKey(match);
  if (!opts.refresh) {
    const hit = await cache.get({ persist, match, memoryKey });
    if (hit) return { results: hit.value, provider: provider.name, checkedAt: new Date(hit.storedAt).toISOString(), fromCache: true, mock };
  }
  try {
    const results = await provider.search(input);
    await cache.set({ persist, match, memoryKey, value: results, ttlMs: TTL.productSearch });
    return { results, provider: provider.name, checkedAt: new Date().toISOString(), fromCache: false, mock };
  } catch (err) {
    throw err instanceof ProviderUnavailableError ? err : new ProviderUnavailableError();
  }
}
