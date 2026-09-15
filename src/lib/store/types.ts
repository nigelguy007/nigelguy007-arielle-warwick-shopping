import type {
  AccommodationListing,
  AccommodationProfile,
  BasketItem,
  Budget,
  ChecklistItem,
  ChecklistStatus,
  ChecklistView,
  Contribution,
  Profile,
  PriceWatch,
  Priority,
  ProductSearchResult,
  Purchase,
  SharedAccess,
  SharedAccessView,
  ShareInvite,
  StoreConnection,
  Timing,
  UserChecklistEntry,
} from "@/lib/types";

export interface ChecklistImportRow {
  sourceKey: string;
  category: string;
  item: string;
  priority: ChecklistItem["priority"];
  timing: ChecklistItem["timing"];
  defaultQty: number;
  budgetEstimate: number | null;
  notes: string;
}

export type AccommodationSeed = Omit<AccommodationProfile, "id">;

/**
 * Every persistence operation the app needs. Implementations:
 *  - LocalStore: JSON file, single demo user, development only.
 *  - SupabaseStore: Postgres with RLS, scoped by the signed-in user's client.
 * All user-scoped methods take an explicit userId so the local store can mirror RLS.
 */
export interface DataStore {
  readonly kind: "local" | "supabase";

  // Profiles
  getProfile(userId: string): Promise<Profile | null>;
  upsertProfile(userId: string, patch: Partial<Omit<Profile, "id" | "createdAt" | "updatedAt">>): Promise<Profile>;

  // Base checklist (read-only for users) - shared items only (ownerId null).
  listChecklistItems(): Promise<ChecklistItem[]>;
  getChecklistItem(id: string): Promise<ChecklistItem | null>;
  /** A student's own item, added free-text - not part of the shared base
   * list, only ever visible to them. Appears in their listUserChecklist()
   * alongside the shared items. */
  addCustomChecklistItem(userId: string, input: { category: string; item: string; qty?: number; notes?: string; priority?: Priority; timing?: Timing; budgetEstimate?: number | null }): Promise<ChecklistItem>;

  // User checklist
  listUserChecklist(userId: string): Promise<ChecklistView[]>;
  getUserChecklistItem(userId: string, checklistItemId: string): Promise<ChecklistView | null>;
  setChecklistStatus(userId: string, checklistItemId: string, status: ChecklistStatus, patch?: { qty?: number; customNotes?: string; box?: string }): Promise<UserChecklistEntry>;

  // Accommodation - Warwick-specific, hand-verified room facts.
  listAccommodations(): Promise<AccommodationProfile[]>;
  getAccommodation(slug: string): Promise<AccommodationProfile | null>;

  /**
   * Real per-university accommodation listings scraped from that
   * university's own pages (see accommodation_listings /
   * scripts/scrape-accommodation.ts). `universityName` is matched against
   * data/uk_he_providers.json to resolve a UKPRN; returns [] if there's no
   * match or nothing scraped for that university yet - callers must show
   * a "we don't have data yet" state rather than falling back to another
   * university's listings (e.g. Warwick's).
   */
  listAccommodationListings(universityName: string): Promise<AccommodationListing[]>;

  // Budget
  getBudget(userId: string): Promise<Budget | null>;
  setBudget(userId: string, amount: number, name?: string): Promise<Budget>;

  // Basket
  listBasket(userId: string): Promise<BasketItem[]>;
  addToBasket(userId: string, product: ProductSearchResult, quantity: number, checklistItemId: string | null): Promise<BasketItem>;
  removeFromBasket(userId: string, basketItemId: string): Promise<void>;

  // Purchases
  listPurchases(userId: string): Promise<Purchase[]>;
  addPurchase(userId: string, purchase: Omit<Purchase, "id" | "userId" | "purchasedAt" | "receiptImage"> & { purchasedAt?: string; receiptImage?: string | null }): Promise<Purchase>;
  /** Attach/replace a purchase's receipt image. Returns null if the purchase doesn't exist or isn't the caller's. */
  updatePurchase(userId: string, purchaseId: string, patch: { receiptImage?: string | null }): Promise<Purchase | null>;

  // Price watch: the last price we recorded per tracked item, for price-drop alerts.
  listPriceWatches(userId: string): Promise<PriceWatch[]>;
  getPriceWatch(userId: string, itemKey: string): Promise<PriceWatch | null>;
  recordPriceObservation(
    userId: string,
    itemKey: string,
    patch: { label: string; retailer: string; price: number; currency: string; productUrl: string | null },
  ): Promise<PriceWatch>;

  /**
   * Parent sharing. An "owner" (the student) invites a "viewer" (a parent) to a
   * read-only view of their checklist and/or budget. In Supabase mode this is
   * enforced by RLS (see supabase/migrations/0001_init.sql); in local mode there
   * is only ever one real identity, so a redeemed invite is a self-preview - see
   * LocalStore's docstring on redeemInvite.
   */
  listShares(ownerId: string): Promise<SharedAccess[]>;
  listSharedWithMe(viewerId: string): Promise<SharedAccessView[]>;
  revokeShare(ownerId: string, viewerId: string): Promise<void>;
  createInvite(ownerId: string, opts: { canViewChecklist: boolean; canViewBudget: boolean; expiresInHours: number }): Promise<ShareInvite>;
  listInvites(ownerId: string): Promise<ShareInvite[]>;
  revokeInvite(ownerId: string, inviteId: string): Promise<void>;
  redeemInvite(viewerId: string, code: string): Promise<SharedAccess>;

  /** The "contribution pot": payments/pledges a parent logs toward the move-in budget. */
  listContributions(ownerId: string): Promise<Contribution[]>;
  addContribution(ownerId: string, contributorId: string, contributorName: string, input: { amount: number; note: string; checklistItemId: string | null }): Promise<Contribution>;

  /** Store connections - see StoreConnection in @/lib/types. A row only ever
   * exists once the student has actually authorized it. */
  listStoreConnections(userId: string): Promise<StoreConnection[]>;
  connectStore(userId: string, retailer: string): Promise<StoreConnection>;
  disconnectStore(userId: string, retailer: string): Promise<void>;
}

/** Admin/seed operations. Local: same object. Supabase: needs the secret key. */
export interface AdminStore {
  upsertChecklistItems(rows: ChecklistImportRow[]): Promise<{ inserted: number; updated: number }>;
  upsertAccommodations(rows: AccommodationSeed[]): Promise<number>;
  seedUserStatuses(userId: string, statuses: Array<{ sourceKey: string; status: ChecklistStatus }>, opts?: { overwrite?: boolean }): Promise<number>;
  /** Every user id known to the app (has a profile row). Used by the alerts cron to sweep all users. */
  listProfileUserIds(): Promise<string[]>;
}
