import "server-only";
import { getStore } from "@/lib/store";
import { searchProducts, ProviderUnavailableError } from "@/lib/providers/product";
import { searchOffers } from "@/lib/providers/offer";
import { nearbyStores } from "@/lib/providers/map";
import { pickRecommendations, type Recommendations } from "@/lib/ranking/value-score";
import { accommodationWarningFor, categoryOfItem } from "@/lib/ranking/compatibility";
import type { AccommodationProfile, ChecklistView, LocationContext, OfferResult, ProductSearchResult, StoreResult } from "@/lib/types";
import { defaultLocationFor } from "@/lib/types";
import { findItemByName } from "@/lib/services/dashboard";

export interface CompareResult {
  query: string;
  item: ChecklistView | null;
  accommodation: AccommodationProfile | null;
  warning: string | null;
  provider: string;
  checkedAt: string;
  fromCache: boolean;
  mock: boolean;
  results: ProductSearchResult[];
  recommendations: Recommendations;
  offers: OfferResult[];
  stores: StoreResult[];
  error: string | null;
}

export async function compareProducts(
  userId: string,
  opts: { query?: string; itemId?: string; location?: LocationContext | null; maxPrice?: number; refresh?: boolean; onlineOnly?: boolean; limit?: number },
): Promise<CompareResult> {
  const store = await getStore();
  const profile = await store.getProfile(userId);
  const accommodation = profile?.accommodationSlug ? await store.getAccommodation(profile.accommodationSlug) : null;
  let item = opts.itemId ? await store.getUserChecklistItem(userId, opts.itemId) : null;
  // A free-text search that names a checklist item is linked to it so "Mark bought" updates the list.
  if (!item && opts.query?.trim()) item = findItemByName(await store.listUserChecklist(userId), opts.query.trim());
  const query = (opts.query ?? item?.item ?? "").trim();
  const location = opts.location ?? defaultLocationFor(profile?.university ?? null);
  const itemLike = item ?? { item: query, category: "" };
  const warning = accommodationWarningFor(itemLike, accommodation);
  const kind = categoryOfItem(itemLike);

  const empty: Recommendations = { cheapest: null, bestValue: null, nearby: null, excluded: [], all: [] };
  if (!query) return { query, item, accommodation, warning, provider: "none", checkedAt: new Date().toISOString(), fromCache: false, mock: false, results: [], recommendations: empty, offers: [], stores: [], error: "Tell me what to search for." };

  // Hard rule: Warwick-supplied appliances are never sourced.
  if (warning === "Warwick already provides this.") {
    return { query, item, accommodation, warning, provider: "none", checkedAt: new Date().toISOString(), fromCache: false, mock: false, results: [], recommendations: empty, offers: [], stores: [], error: null };
  }

  const requiredAttributes = kind === "cookware" && accommodation?.verifiedAt && accommodation.hobType === "induction" ? ["induction"] : undefined;
  let search;
  try {
    search = await searchProducts({ query, category: item?.category, quantity: item?.qty, location, maxPrice: opts.maxPrice, requiredAttributes, onlineOnly: opts.onlineOnly, limit: opts.limit ?? 10 }, { refresh: opts.refresh });
  } catch (err) {
    const message = err instanceof ProviderUnavailableError ? err.message : "I can't check live prices right now. Your checklist is safe. Try the price search again.";
    return { query, item, accommodation, warning, provider: "unavailable", checkedAt: new Date().toISOString(), fromCache: false, mock: false, results: [], recommendations: empty, offers: [], stores: [], error: message };
  }

  const retailers = [...new Set(search.results.map((r) => r.retailer))];
  const [offerLists, storesRes] = await Promise.all([
    Promise.all(retailers.slice(0, 8).map((r) => searchOffers({ retailer: r }))),
    opts.onlineOnly || !location.coords ? Promise.resolve(null) : nearbyStores({ center: location.coords, radiusMeters: 20000, limit: 20 }).catch(() => null),
  ]);
  const offers = offerLists.flatMap((o) => o.offers);
  const stores = storesRes?.stores ?? [];
  const recommendations = pickRecommendations(search.results, { item: itemLike, profile: accommodation, offers, stores });
  return { query, item, accommodation, warning, provider: search.provider, checkedAt: search.checkedAt, fromCache: search.fromCache, mock: search.mock, results: search.results, recommendations, offers, stores, error: null };
}
