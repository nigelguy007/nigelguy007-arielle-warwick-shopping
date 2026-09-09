import { describe, expect, it } from "vitest";
import { MockMapProvider } from "@/lib/providers/map/mock";
import { GoogleMapProvider } from "@/lib/providers/map/google";
import { haversineMeters } from "@/lib/providers/map/types";
import { WARWICK_CAMPUS } from "@/lib/types";

const campus = WARWICK_CAMPUS.coords!;

describe("MockMapProvider", () => {
  it("returns stores sorted by distance, never claiming stock", async () => {
    const stores = await new MockMapProvider().searchNearby({ center: campus, limit: 5 });
    expect(stores).toHaveLength(5);
    for (let i = 1; i < stores.length; i++) expect(stores[i].distanceMeters!).toBeGreaterThanOrEqual(stores[i - 1].distanceMeters!);
    expect(stores.every((s) => s.sourceConfidence === "mock")).toBe(true);
  });
  it("filters by retailer and category", async () => {
    const argos = await new MockMapProvider().searchNearby({ center: campus, retailer: "Argos" });
    expect(argos.every((s) => s.retailerKey === "Argos")).toBe(true);
    const pharmacies = await new MockMapProvider().searchNearby({ center: campus, categories: ["pharmacy"] });
    expect(pharmacies.every((s) => s.category === "pharmacy")).toBe(true);
  });
  it("geocodes the campus postcode", async () => {
    const hit = await new MockMapProvider().geocodePostcode("cv4 7al");
    expect(hit?.coords.lat).toBeCloseTo(52.379, 2);
  });
  it("haversine is sane", () => {
    expect(haversineMeters(campus, campus)).toBe(0);
    expect(haversineMeters(campus, { lat: 52.4081, lng: -1.5106 })).toBeGreaterThan(4000);
  });
});

describe("GoogleMapProvider (mocked HTTP)", () => {
  const fakeFetch: typeof fetch = async (input, init) => {
    const url = String(input);
    const headers = init?.headers as Record<string, string>;
    expect(headers["X-Goog-FieldMask"]).toContain("places.displayName");
    expect(headers["X-Goog-Api-Key"]).toBe("k");
    if (url.endsWith("searchNearby")) {
      const body = JSON.parse(String(init?.body));
      expect(body.locationRestriction.circle.center.latitude).toBeCloseTo(campus.lat, 3);
      return new Response(JSON.stringify({ places: [{ id: "abc", displayName: { text: "Tesco Extra" }, formattedAddress: "Cannon Park", location: { latitude: 52.3945, longitude: -1.5525 }, rating: 4.1, userRatingCount: 900, currentOpeningHours: { openNow: true }, googleMapsUri: "https://maps.google.com/?cid=1", primaryType: "supermarket" }] }));
    }
    if (url.endsWith("searchText")) return new Response(JSON.stringify({ places: [{ id: "argos", displayName: { text: "Argos" }, location: { latitude: 52.39, longitude: -1.52 } }] }));
    return new Response("{}", { status: 404 });
  };
  it("maps nearby search with field masks", async () => {
    const stores = await new GoogleMapProvider("k", false, fakeFetch).searchNearby({ center: campus, categories: ["supermarket"] });
    expect(stores[0]).toMatchObject({ name: "Tesco Extra", openNow: true, category: "supermarket", sourceConfidence: "verified", provider: "google" });
    expect(stores[0].distanceMeters).toBeGreaterThan(0);
  });
  it("uses text search for a named retailer", async () => {
    const stores = await new GoogleMapProvider("k", false, fakeFetch).searchNearby({ center: campus, retailer: "Argos" });
    expect(stores[0].retailerKey).toBe("Argos");
  });
  it("returns null travel time when Routes is disabled", async () => {
    expect(await new GoogleMapProvider("k", false, fakeFetch).travelTimeMinutes(campus, campus)).toBeNull();
  });
  it.runIf(process.env.GOOGLE_MAPS_SERVER_API_KEY)("LIVE: finds supermarkets near campus", async () => {
    const stores = await new GoogleMapProvider(process.env.GOOGLE_MAPS_SERVER_API_KEY as string).searchNearby({ center: campus, categories: ["supermarket"], limit: 3 });
    expect(stores.length).toBeGreaterThan(0);
  });
});
