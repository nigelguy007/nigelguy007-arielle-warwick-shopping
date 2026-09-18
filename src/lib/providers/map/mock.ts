import type { LatLng, StoreResult } from "@/lib/types";
import { googleMapsSearchUrl, haversineMeters, type MapProvider, type NearbyStoresInput, type StoreCategory } from "./types";

interface MockStore {
  name: string;
  retailerKey: string;
  category: StoreCategory;
  address: string;
  location: LatLng;
}

// Illustrative mock stores placed around Coventry / Leamington / Warwick.
// Coordinates and addresses are approximate and labelled as mock in the UI.
const STORES: MockStore[] = [
  // Cannon Park Shopping Centre (Lynchgate Road, next to Warwick campus) -
  // tenants per cannonparkshopping.co.uk/stores; only the ones relevant to
  // a move-in shop are listed (no cafes, barbers, travel agents etc.).
  { name: "Cannon Park Shopping Centre", retailerKey: "", category: "shopping_centre", address: "Lynchgate Road, Coventry CV4 7EH", location: { lat: 52.3946, lng: -1.5527 } },
  { name: "Tesco Extra Cannon Park", retailerKey: "Tesco", category: "supermarket", address: "Cannon Park Shopping Centre, Lynchgate Road, Coventry CV4 7EH", location: { lat: 52.3945, lng: -1.5525 } },
  { name: "Aldi Cannon Park", retailerKey: "Aldi", category: "supermarket", address: "7 Shultern Lane, Coventry CV4 7AN", location: { lat: 52.3936, lng: -1.5545 } },
  { name: "Iceland Cannon Park", retailerKey: "Iceland", category: "supermarket", address: "Cannon Park Shopping Centre, Lynchgate Road, Coventry CV4 7EH", location: { lat: 52.3948, lng: -1.5530 } },
  { name: "Boots Cannon Park", retailerKey: "Boots", category: "pharmacy", address: "Cannon Park Shopping Centre, Lynchgate Road, Coventry CV4 7EH", location: { lat: 52.3947, lng: -1.5528 } },
  { name: "Holland & Barrett Cannon Park", retailerKey: "Holland & Barrett", category: "pharmacy", address: "Cannon Park Shopping Centre, Lynchgate Road, Coventry CV4 7EH", location: { lat: 52.3947, lng: -1.5531 } },
  { name: "OneBeyond Cannon Park", retailerKey: "OneBeyond", category: "home_goods", address: "Cannon Park Shopping Centre, Lynchgate Road, Coventry CV4 7EH", location: { lat: 52.3949, lng: -1.5526 } },
  { name: "Bargain Buys Cannon Park", retailerKey: "Bargain Buys", category: "home_goods", address: "Cannon Park Shopping Centre, Lynchgate Road, Coventry CV4 7EH", location: { lat: 52.3949, lng: -1.5529 } },
  { name: "CeX Cannon Park", retailerKey: "CeX", category: "electronics", address: "Cannon Park Shopping Centre, Lynchgate Road, Coventry CV4 7EH", location: { lat: 52.3946, lng: -1.5532 } },
  { name: "Peacocks Cannon Park", retailerKey: "Peacocks", category: "clothing", address: "Cannon Park Shopping Centre, Lynchgate Road, Coventry CV4 7EH", location: { lat: 52.3944, lng: -1.5530 } },
  { name: "Sports Direct Cannon Park", retailerKey: "Sports Direct", category: "clothing", address: "Cannon Park Shopping Centre, Lynchgate Road, Coventry CV4 7EH", location: { lat: 52.3944, lng: -1.5527 } },
  { name: "Sainsbury's Kenilworth", retailerKey: "Sainsbury's", category: "supermarket", address: "Warwick Road, Kenilworth CV8 1FN", location: { lat: 52.3427, lng: -1.5713 } },
  { name: "Argos Coventry Central Six", retailerKey: "Argos", category: "home_goods", address: "Central Six Retail Park, Coventry CV3 6TA", location: { lat: 52.3987, lng: -1.5188 } },
  { name: "Currys Coventry", retailerKey: "Currys", category: "electronics", address: "Central Six Retail Park, Coventry CV3 6TA", location: { lat: 52.3991, lng: -1.5195 } },
  { name: "Dunelm Coventry", retailerKey: "Dunelm", category: "home_goods", address: "Alvis Retail Park, Coventry CV5 8BW", location: { lat: 52.4067, lng: -1.5323 } },
  { name: "B&M Coventry", retailerKey: "B&M", category: "home_goods", address: "Alvis Retail Park, Coventry CV5 8BW", location: { lat: 52.4062, lng: -1.5330 } },
  { name: "Primark Coventry", retailerKey: "Primark", category: "clothing", address: "West Orchards, Coventry CV1 1QX", location: { lat: 52.4088, lng: -1.5109 } },
  { name: "Superdrug Coventry", retailerKey: "Superdrug", category: "pharmacy", address: "Lower Precinct, Coventry CV1 1DX", location: { lat: 52.4083, lng: -1.5120 } },
  { name: "Home Bargains Coventry", retailerKey: "Home Bargains", category: "home_goods", address: "Gallagher Retail Park, Coventry CV6 6QF", location: { lat: 52.4380, lng: -1.4863 } },
  { name: "John Lewis Leamington Spa", retailerKey: "John Lewis", category: "department_store", address: "Parade, Leamington Spa CV32 4DG", location: { lat: 52.2903, lng: -1.5356 } },
  { name: "IKEA Coventry (collection point)", retailerKey: "IKEA", category: "home_goods", address: "Coventry city centre collection point", location: { lat: 52.4105, lng: -1.5097 } },
  { name: "West Orchards Shopping Centre", retailerKey: "", category: "shopping_centre", address: "Smithford Way, Coventry CV1 1QX", location: { lat: 52.4088, lng: -1.5105 } },
  { name: "Leamington Shopping Park", retailerKey: "", category: "shopping_centre", address: "Tachbrook Park Drive, Leamington Spa CV34 6RH", location: { lat: 52.2708, lng: -1.5541 } },
];

const POSTCODES: Record<string, { coords: LatLng; label: string }> = {
  CV47AL: { coords: { lat: 52.3793, lng: -1.5615 }, label: "University of Warwick, Coventry CV4 7AL" },
  CV11AA: { coords: { lat: 52.4081, lng: -1.5106 }, label: "Coventry city centre CV1" },
  CV324AA: { coords: { lat: 52.2900, lng: -1.5350 }, label: "Leamington Spa CV32" },
  CV81AA: { coords: { lat: 52.3420, lng: -1.5700 }, label: "Kenilworth CV8" },
};

export class MockMapProvider implements MapProvider {
  readonly name = "mock";

  async searchNearby(input: NearbyStoresInput): Promise<StoreResult[]> {
    const radius = input.radiusMeters ?? 15000;
    const now = new Date().toISOString();
    const hour = new Date().getHours();
    return STORES.filter((s) => (input.categories?.length ? input.categories.includes(s.category) : true))
      .filter((s) => (input.retailer ? s.retailerKey.toLowerCase() === input.retailer.toLowerCase() || s.name.toLowerCase().includes(input.retailer.toLowerCase()) : true))
      .map((s): StoreResult => ({
        id: `mock-store-${s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        provider: "mock",
        name: s.name,
        address: s.address,
        location: s.location,
        distanceMeters: haversineMeters(input.center, s.location),
        openNow: hour >= 9 && hour < 20,
        openingHours: ["Mock hours: 9am - 8pm"],
        rating: 4.1,
        reviewCount: 250,
        category: s.category,
        retailerKey: s.retailerKey || null,
        googleMapsUrl: googleMapsSearchUrl(`${s.name} ${s.address}`, s.location),
        travelTimeMinutes: null,
        checkedAt: now,
        sourceConfidence: "mock",
      }))
      .filter((s) => (s.distanceMeters ?? 0) <= radius)
      .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0))
      .slice(0, input.limit ?? 20);
  }

  async geocodePostcode(postcode: string) {
    const key = postcode.toUpperCase().replace(/\s+/g, "");
    if (POSTCODES[key]) return POSTCODES[key];
    const prefix = Object.keys(POSTCODES).find((k) => k.startsWith(key.slice(0, 3)));
    if (prefix) return { ...POSTCODES[prefix], label: `${postcode.toUpperCase()} (approximate, mock)` };
    return null;
  }
}
