import type { LatLng, StoreResult } from "@/lib/types";
import { googleMapsSearchUrl, haversineMeters, type MapProvider, type NearbyStoresInput, type StoreCategory } from "./types";
import { timed } from "@/lib/logger";

// Places API (New) primary types per category. Only requested fields are billed (field mask).
const CATEGORY_TYPES: Record<StoreCategory, string[]> = {
  supermarket: ["supermarket", "grocery_store"],
  pharmacy: ["pharmacy", "drugstore"],
  home_goods: ["home_goods_store", "home_improvement_store"],
  department_store: ["department_store"],
  electronics: ["electronics_store"],
  clothing: ["clothing_store"],
  shopping_centre: ["shopping_mall"],
};

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.currentOpeningHours.openNow",
  "places.currentOpeningHours.weekdayDescriptions",
  "places.googleMapsUri",
  "places.primaryType",
].join(",");

interface GooglePlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  currentOpeningHours?: { openNow?: boolean; weekdayDescriptions?: string[] };
  googleMapsUri?: string;
  primaryType?: string;
}

function categoryFromType(type: string | undefined, fallback: StoreCategory): StoreCategory {
  if (!type) return fallback;
  for (const [cat, types] of Object.entries(CATEGORY_TYPES) as [StoreCategory, string[]][]) {
    if (types.includes(type)) return cat;
  }
  return fallback;
}

/** Google Places API (New) adapter. Store existence and opening data only - never product stock. */
export class GoogleMapProvider implements MapProvider {
  readonly name = "google";
  constructor(private readonly apiKey: string, private readonly routesEnabled = false, private readonly fetchImpl: typeof fetch = fetch) {}

  private toStore(p: GooglePlace, center: LatLng, category: StoreCategory, retailer: string | null): StoreResult {
    const location = { lat: p.location?.latitude ?? center.lat, lng: p.location?.longitude ?? center.lng };
    return {
      id: `google-${p.id}`,
      provider: "google",
      name: p.displayName?.text ?? "Store",
      address: p.formattedAddress ?? "",
      location,
      distanceMeters: haversineMeters(center, location),
      openNow: p.currentOpeningHours?.openNow ?? null,
      openingHours: p.currentOpeningHours?.weekdayDescriptions ?? null,
      rating: p.rating ?? null,
      reviewCount: p.userRatingCount ?? null,
      category: categoryFromType(p.primaryType, category),
      retailerKey: retailer,
      googleMapsUrl: p.googleMapsUri ?? googleMapsSearchUrl(p.displayName?.text ?? "", location),
      travelTimeMinutes: null,
      checkedAt: new Date().toISOString(),
      sourceConfidence: "verified",
    };
  }

  async searchNearby(input: NearbyStoresInput): Promise<StoreResult[]> {
    const center = input.center;
    const radius = Math.min(input.radiusMeters ?? 10000, 50000);
    const limit = Math.min(input.limit ?? 20, 20);
    if (input.retailer) {
      // Text Search is better for a named retailer.
      return timed("google", "places.searchText", async () => {
        const res = await this.fetchImpl("https://places.googleapis.com/v1/places:searchText", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Goog-Api-Key": this.apiKey, "X-Goog-FieldMask": FIELD_MASK },
          body: JSON.stringify({
            textQuery: input.retailer,
            languageCode: "en-GB",
            regionCode: "GB",
            pageSize: limit,
            locationBias: { circle: { center: { latitude: center.lat, longitude: center.lng }, radius } },
          }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) throw new Error(`Places searchText responded ${res.status}`);
        const json = (await res.json()) as { places?: GooglePlace[] };
        return (json.places ?? []).map((p) => this.toStore(p, center, input.categories?.[0] ?? "home_goods", input.retailer ?? null)).sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));
      });
    }
    const categories = input.categories?.length ? input.categories : (Object.keys(CATEGORY_TYPES) as StoreCategory[]);
    const includedTypes = categories.flatMap((c) => CATEGORY_TYPES[c]);
    return timed("google", "places.searchNearby", async () => {
      const res = await this.fetchImpl("https://places.googleapis.com/v1/places:searchNearby", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": this.apiKey, "X-Goog-FieldMask": FIELD_MASK },
        body: JSON.stringify({
          includedTypes,
          maxResultCount: limit,
          languageCode: "en-GB",
          regionCode: "GB",
          rankPreference: "DISTANCE",
          locationRestriction: { circle: { center: { latitude: center.lat, longitude: center.lng }, radius } },
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`Places searchNearby responded ${res.status}`);
      const json = (await res.json()) as { places?: GooglePlace[] };
      return (json.places ?? []).map((p) => this.toStore(p, center, categories[0], null));
    });
  }

  async geocodePostcode(postcode: string) {
    return timed("google", "geocode", async () => {
      const params = new URLSearchParams({ address: postcode, region: "gb", components: "country:GB", key: this.apiKey });
      const res = await this.fetchImpl(`https://maps.googleapis.com/maps/api/geocode/json?${params}`, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Geocoding responded ${res.status}`);
      const json = (await res.json()) as { results?: Array<{ formatted_address: string; geometry: { location: { lat: number; lng: number } } }> };
      const first = json.results?.[0];
      if (!first) return null;
      return { coords: first.geometry.location, label: first.formatted_address };
    });
  }

  async travelTimeMinutes(from: LatLng, to: LatLng): Promise<number | null> {
    if (!this.routesEnabled) return null;
    return timed("google", "routes", async () => {
      const res = await this.fetchImpl("https://routes.googleapis.com/directions/v2:computeRoutes", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": this.apiKey, "X-Goog-FieldMask": "routes.duration" },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: from.lat, longitude: from.lng } } },
          destination: { location: { latLng: { latitude: to.lat, longitude: to.lng } } },
          travelMode: "DRIVE",
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { routes?: Array<{ duration?: string }> };
      const dur = json.routes?.[0]?.duration;
      if (!dur) return null;
      const seconds = Number(dur.replace(/s$/, ""));
      return Number.isFinite(seconds) ? Math.round(seconds / 60) : null;
    });
  }
}
