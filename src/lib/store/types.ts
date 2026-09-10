import type {
  AccommodationProfile,
  BasketItem,
  Budget,
  ChecklistItem,
  ChecklistStatus,
  ChecklistView,
  Profile,
  PriceWatch,
  ProductSearchResult,
  Purchase,
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

  // Base checklist (read-only for users)
  listChecklistItems(): Promise<ChecklistItem[]>;
  getChecklistItem(id: string): Promise<ChecklistItem | null>;

  // User checklist
  listUserChecklist(userId: string): Promise<ChecklistView[]>;
  getUserChecklistItem(userId: string, checklistItemId: string): Promise<ChecklistView | null>;
  setChecklistStatus(userId: string, checklistItemId: string, status: ChecklistStatus, patch?: { qty?: number; customNotes?: string }): Promise<UserChecklistEntry>;

  // Accommodation
  listAccommodations(): Promise<AccommodationProfile[]>;
  getAccommodation(slug: string): Promise<AccommodationProfile | null>;

  // Budget
  getBudget(userId: string): Promise<Budget | null>;
  setBudget(userId: string, amount: number, name?: string): Promise<Budget>;

  // Basket
  listBasket(userId: string): Promise<BasketItem[]>;
  addToBasket(userId: string, product: ProductSearchResult, quantity: number, checklistItemId: string | null): Promise<BasketItem>;
  removeFromBasket(userId: string, basketItemId: string): Promise<void>;

  // Purchases
  listPurchases(userId: string): Promise<Purchase[]>;
  addPurchase(userId: string, purchase: Omit<Purchase, "id" | "userId" | "purchasedAt"> & { purchasedAt?: string }): Promise<Purchase>;

  // Price watch: the last price we recorded per tracked item, for price-drop alerts.
  listPriceWatches(userId: string): Promise<PriceWatch[]>;
  getPriceWatch(userId: string, itemKey: string): Promise<PriceWatch | null>;
  recordPriceObservation(
    userId: string,
    itemKey: string,
    patch: { label: string; retailer: string; price: number; currency: string; productUrl: string | null },
  ): Promise<PriceWatch>;
}

/** Admin/seed operations. Local: same object. Supabase: needs the secret key. */
export interface AdminStore {
  upsertChecklistItems(rows: ChecklistImportRow[]): Promise<{ inserted: number; updated: number }>;
  upsertAccommodations(rows: AccommodationSeed[]): Promise<number>;
  seedUserStatuses(userId: string, statuses: Array<{ sourceKey: string; status: ChecklistStatus }>, opts?: { overwrite?: boolean }): Promise<number>;
  /** Every user id known to the app (has a profile row). Used by the alerts cron to sweep all users. */
  listProfileUserIds(): Promise<string[]>;
}
