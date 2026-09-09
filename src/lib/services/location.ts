import { WARWICK_CAMPUS, type LocationContext } from "@/lib/types";

/** Parses a location from query params or a JSON body. Never persisted. */
export function parseLocation(input: { lat?: string | number | null; lng?: string | number | null; postcode?: string | null; label?: string | null; source?: string | null }): LocationContext | null {
  const lat = input.lat == null || input.lat === "" ? NaN : Number(input.lat);
  const lng = input.lng == null || input.lng === "" ? NaN : Number(input.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    const source = input.source === "postcode" || input.source === "campus" ? input.source : "device";
    return { label: input.label?.toString().slice(0, 120) || (source === "device" ? "Your location" : "Selected location"), source, coords: { lat, lng }, postcode: input.postcode?.toString().toUpperCase().slice(0, 10) ?? null };
  }
  if (input.source === "campus") return WARWICK_CAMPUS;
  return null;
}

export function isValidUkPostcode(pc: string): boolean {
  return /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(pc.trim());
}
