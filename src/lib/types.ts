// Shared domain types. Keep these framework-free so tests and scripts can import them.
import { isWarwickUniversityName } from "./university-match";

export const CHECKLIST_STATUSES = [
  "need",
  "have",
  "buy",
  "bought",
  "packed",
  "wait",
  "do_not_buy",
] as const;
export type ChecklistStatus = (typeof CHECKLIST_STATUSES)[number];

export const STATUS_LABELS: Record<ChecklistStatus, string> = {
  need: "Need",
  have: "Already have",
  buy: "Buy",
  bought: "Bought",
  packed: "Packed",
  wait: "Wait until arrival",
  do_not_buy: "Do not buy",
};

export const PRIORITIES = ["essential", "recommended", "optional"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const TIMINGS = [
  "buy_before",
  "take_from_home",
  "wait_until_arrival",
  "do_not_buy_yet",
] as const;
export type Timing = (typeof TIMINGS)[number];

export const TIMING_LABELS: Record<Timing, string> = {
  buy_before: "Buy before move-in",
  take_from_home: "Take from home",
  wait_until_arrival: "Wait until arrival",
  do_not_buy_yet: "Do not buy yet",
};

export interface ChecklistItem {
  id: string;
  sourceKey: string;
  category: string;
  item: string;
  priority: Priority;
  timing: Timing;
  defaultQty: number;
  budgetEstimate: number | null;
  notes: string;
  /** True for an item a student added themselves (not the shared base 77).
   * Only visible to its owner - see ownerId. */
  custom: boolean;
  ownerId: string | null;
}

export interface UserChecklistEntry {
  id: string;
  userId: string;
  checklistItemId: string;
  status: ChecklistStatus;
  qty: number;
  customNotes: string;
  /** Free-text label for which moving box/bag this item is in. Empty until set in packing mode. */
  box: string;
  updatedAt: string;
}

/** A checklist item joined with the user's own status. */
export interface ChecklistView extends ChecklistItem {
  status: ChecklistStatus;
  qty: number;
  customNotes: string;
  box: string;
  updatedAt: string | null;
}

export type HobType = "induction" | "ceramic" | "gas" | "electric_coil" | "unknown";
export type BedSize = "single" | "small_double" | "double" | "king" | "unknown";

export interface AccommodationProfile {
  id: string;
  slug: string;
  name: string;
  officialUrl: string;
  verifiedAt: string | null;
  bedSize: BedSize | null;
  mattressDimensions: string | null;
  ensuite: boolean | null;
  sharedBathroom: boolean | null;
  kitchenType: string | null;
  hobType: HobType | null;
  suppliedAppliances: string[];
  prohibitedItems: string[];
  notes: Record<string, unknown>;
}

/**
 * A single scraped, sourced accommodation option for a real UK university
 * (see supabase/migrations/0007_accommodation_listings.sql and
 * scripts/scrape-accommodation.ts). Distinct from AccommodationProfile
 * above, which is Warwick-specific hand-verified room data (bed size, hob
 * type, etc). This only ever carries what was found on the university's
 * own pricing/contract pages - a null field means "not stated there", not
 * "assumed".
 */
export interface AccommodationListing {
  id: string;
  universityUkprn: string;
  universityName: string;
  accommodationName: string;
  roomType: string | null;
  weeklyPrice: number | null;
  contractLength: string | null;
  totalCost: number | null;
  bathroomType: "ensuite" | "shared" | null;
  cateringType: "catered" | "self-catered" | null;
  address: string | null;
  academicYear: string | null;
  sourceUrl: string;
  lastChecked: string;
}

export interface Profile {
  id: string;
  firstName: string;
  university: string;
  /** Free-text town/city (e.g. "Coventry, UK"), captured in onboarding's first step. */
  universityLocation: string | null;
  /** e.g. "1st year", "Postgraduate" - free text so it fits any institution's labels. */
  yearOfStudy: string | null;
  accommodationSlug: string | null;
  defaultPostcode: string | null;
  /** ISO date (YYYY-MM-DD) the student moves into halls. Drives the Home countdown. */
  moveInDate: string | null;
  notifyPriceAlerts: boolean;
  notifyVoucherExpiry: boolean;
  notifyWeeklyDigest: boolean;
  onboardingComplete: boolean;
  /** ISO timestamp the terms/privacy notice was accepted, server-stamped (never client-supplied) - GDPR consent proof. Null until step 3 of onboarding. */
  termsAcceptedAt: string | null;
  /** Which TERMS_VERSION (src/lib/legal/terms.ts) was accepted, so a later material change can require re-consent. */
  termsVersion: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  userId: string;
  name: string;
  amount: number;
  currency: string;
  createdAt: string;
}

export interface Purchase {
  id: string;
  userId: string;
  checklistItemId: string | null;
  productSnapshot: ProductSearchResult | null;
  retailer: string;
  paidPrice: number;
  voucherUsed: string | null;
  purchasedAt: string;
  /**
   * Receipt photo, if attached. Local/dev mode stores this as a base64 data URL directly
   * on the record for simplicity. A production deployment should instead upload the image
   * to Supabase Storage and store the resulting object path/URL here.
   */
  receiptImage: string | null;
}

export interface BasketItem {
  id: string;
  userId: string;
  checklistItemId: string | null;
  productSnapshot: ProductSearchResult;
  quantity: number;
  addedAt: string;
}

/**
 * The last price we recorded for a tracked basket line, so a later check can tell
 * whether it has genuinely dropped. `itemKey` is the checklist item id when the
 * basket line is linked to one, else `basket:<basketItemId>`.
 */
export interface PriceWatch {
  id: string;
  userId: string;
  itemKey: string;
  label: string;
  retailer: string;
  lastPrice: number;
  currency: string;
  productUrl: string | null;
  lastCheckedAt: string;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface LocationContext {
  label: string;
  source: "device" | "postcode" | "campus" | "unset";
  coords: LatLng | null;
  postcode: string | null;
}

export type SourceConfidence = "verified" | "unverified" | "mock";

export interface ProductSearchInput {
  query: string;
  category?: string;
  quantity?: number;
  location?: LocationContext | null;
  maxPrice?: number;
  retailerPreference?: string[];
  requiredAttributes?: string[];
  excludedAttributes?: string[];
  onlineOnly?: boolean;
  localPreferred?: boolean;
  limit?: number;
}

export interface ProductSearchResult {
  id: string;
  provider: string;
  retailer: string;
  title: string;
  description: string;
  currentPrice: number;
  previousPrice?: number;
  currency: string;
  deliveryPrice?: number;
  totalPrice: number;
  rating?: number;
  reviewCount?: number;
  imageUrl: string | null;
  productUrl: string;
  merchantUrl: string | null;
  availability: string;
  /** Free-text attributes detected from the listing (e.g. "induction", "single"). */
  attributes: string[];
  locationContext: string;
  checkedAt: string;
  sourceConfidence: SourceConfidence;
  deliveryDays?: number;
  /** Set when the retailer has a physical store nearby (from the map provider), never inferred from stock. */
  nearbyStoreId?: string;
}

export interface StoreResult {
  id: string;
  provider: string;
  name: string;
  address: string;
  location: LatLng;
  distanceMeters: number | null;
  openNow: boolean | null;
  openingHours: string[] | null;
  rating: number | null;
  reviewCount: number | null;
  category: string;
  retailerKey: string | null;
  googleMapsUrl: string;
  travelTimeMinutes: number | null;
  checkedAt: string;
  sourceConfidence: SourceConfidence;
}

export type OfferType = "voucher" | "promotion" | "student";

export interface OfferSearchInput {
  retailer?: string;
  query?: string;
  region?: string;
  limit?: number;
}

export interface OfferResult {
  id: string;
  provider: string;
  retailer: string;
  title: string;
  description: string;
  code: string | null;
  type: OfferType;
  percentage: number | null;
  amount: number | null;
  minSpend: number | null;
  startDate: string | null;
  endDate: string | null;
  terms: string;
  source: string;
  sourceUrl: string;
  checkedAt: string;
  studentVerificationRequired: boolean;
  verified: boolean;
}

export const RETAILERS = [
  "Argos",
  "Dunelm",
  "IKEA",
  "Tesco",
  "Sainsbury's",
  "Boots",
  "Superdrug",
  "B&M",
  "Home Bargains",
  "Primark",
  "John Lewis",
  "Amazon UK",
  "Currys",
] as const;

// ---------- Store connections ----------
// A student connects a retailer so its prices/stock can be read directly,
// instead of relying only on the aggregated product search. Nothing is
// persisted until they actually authorize it (see the Shop screen) - nowhere
// does the app claim a connection exists before that happens.
export const STORE_METHODS = ["API", "MCP"] as const;
export type StoreMethod = (typeof STORE_METHODS)[number];

export interface StoreConnection {
  id: string;
  userId: string;
  retailer: string;
  method: StoreMethod;
  connectedAt: string;
}

export const WARWICK_CAMPUS: LocationContext = {
  label: "University of Warwick, Coventry CV4 7AL",
  source: "campus",
  coords: { lat: 52.3793, lng: -1.5615 },
  postcode: "CV4 7AL",
};

/** No known location - we don't have a campus coordinate for every
 * university, so unlike Warwick this is never presented as a shortcut;
 * downstream code already treats `coords: null` as "ask for a location". */
export const NO_LOCATION: LocationContext = {
  label: "No location set",
  source: "unset",
  coords: null,
  postcode: null,
};

/** The location to assume when a student hasn't shared one. Only Warwick
 * gets a silent campus default - we don't have verified campus coordinates
 * for other universities, and guessing one would violate the "never invent
 * missing data" rule the accommodation/location data is held to elsewhere. */
export function defaultLocationFor(university: string | null): LocationContext {
  return isWarwickUniversityName(university ?? "") ? WARWICK_CAMPUS : NO_LOCATION;
}

// ---------- Parent sharing ----------

/** Grants a "parent" a read-only view of one owner's checklist and/or budget. */
export interface SharedAccess {
  id: string;
  ownerId: string;
  viewerId: string;
  role: "parent";
  canViewChecklist: boolean;
  canViewBudget: boolean;
  createdAt: string;
}

/** A share from the viewer's side, with enough of the owner's profile to label it. */
export interface SharedAccessView extends SharedAccess {
  ownerFirstName: string;
  ownerAccommodationSlug: string | null;
}

/** A one-time link an owner generates for a parent to redeem into a SharedAccess row. */
export interface ShareInvite {
  id: string;
  ownerId: string;
  code: string;
  canViewChecklist: boolean;
  canViewBudget: boolean;
  createdAt: string;
  expiresAt: string;
  redeemedAt: string | null;
  redeemedBy: string | null;
}

/** One payment or pledge a parent logs toward the move-in "pot". Never subtracted
 * from the owner's own budget maths automatically - it is tracked and shown
 * alongside it, since only the owner's own purchases represent real spend. */
export interface Contribution {
  id: string;
  ownerId: string;
  contributorId: string;
  contributorName: string;
  checklistItemId: string | null;
  amount: number;
  note: string;
  createdAt: string;
}
