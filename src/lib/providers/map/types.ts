import type { LatLng, StoreResult } from "@/lib/types";

export type StoreCategory = "supermarket" | "pharmacy" | "home_goods" | "department_store" | "electronics" | "clothing" | "shopping_centre";

export interface NearbyStoresInput {
  center: LatLng;
  radiusMeters?: number;
  categories?: StoreCategory[];
  /** Retailer name to look for, e.g. "Argos" */
  retailer?: string;
  limit?: number;
}

export interface MapProvider {
  readonly name: string;
  searchNearby(input: NearbyStoresInput): Promise<StoreResult[]>;
  geocodePostcode(postcode: string): Promise<{ coords: LatLng; label: string } | null>;
  travelTimeMinutes?(from: LatLng, to: LatLng): Promise<number | null>;
}

export const STORE_CATEGORY_LABELS: Record<StoreCategory, string> = {
  supermarket: "Supermarket",
  pharmacy: "Pharmacy",
  home_goods: "Home goods",
  department_store: "Department store",
  electronics: "Electronics",
  clothing: "Clothing",
  shopping_centre: "Shopping centre",
};

export function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)));
}

export function googleMapsSearchUrl(query: string, coords?: LatLng | null): string {
  const q = encodeURIComponent(query);
  return coords ? `https://www.google.com/maps/search/?api=1&query=${q}&center=${coords.lat},${coords.lng}` : `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export function googleMapsDirectionsUrl(stops: LatLng[], origin?: LatLng | null): string {
  if (stops.length === 0) return "https://www.google.com/maps";
  const dest = stops[stops.length - 1];
  const waypoints = stops.slice(0, -1).map((s) => `${s.lat},${s.lng}`).join("|");
  const params = new URLSearchParams({ api: "1", destination: `${dest.lat},${dest.lng}`, travelmode: "driving" });
  if (origin) params.set("origin", `${origin.lat},${origin.lng}`);
  if (waypoints) params.set("waypoints", waypoints);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
