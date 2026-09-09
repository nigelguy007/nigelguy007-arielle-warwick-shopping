import { randomUUID } from "node:crypto";
import type {
  AccommodationProfile,
  BasketItem,
  Budget,
  ChecklistItem,
  ChecklistStatus,
  ChecklistView,
  Profile,
  ProductSearchResult,
  Purchase,
  UserChecklistEntry,
} from "@/lib/types";
import type { DataStore } from "./types";
import { defaultStatusFromTiming } from "./local";

/** Everything a demo user has changed, kept small enough to live in cookies. */
export interface UserDelta {
  v: 1;
  profile: Profile | null;
  statuses: Record<string, { s: ChecklistStatus; q?: number; n?: string; t: string }>;
  budget: Budget | null;
  basket: BasketItem[];
  purchases: Purchase[];
}

export function emptyDelta(): UserDelta {
  return { v: 1, profile: null, statuses: {}, budget: null, basket: [], purchases: [] };
}

/**
 * DataStore over read-only base data plus a per-user delta. Used for the demo on
 * serverless hosts where no filesystem is shared between functions: the delta is
 * persisted by the caller (cookies) through `onChange`.
 */
export class DeltaStore implements DataStore {
  readonly kind = "local" as const;
  constructor(
    private readonly base: { items: ChecklistItem[]; accommodations: AccommodationProfile[] },
    readonly delta: UserDelta,
    private readonly onChange: (delta: UserDelta) => void,
    private readonly defaults: { firstName: string },
  ) {}

  private commit() {
    this.onChange(this.delta);
  }

  async getProfile(userId: string): Promise<Profile | null> {
    const now = new Date().toISOString();
    return this.delta.profile ?? { id: userId, firstName: this.defaults.firstName, university: "University of Warwick", accommodationSlug: null, defaultPostcode: null, onboardingComplete: false, createdAt: now, updatedAt: now };
  }
  async upsertProfile(userId: string, patch: Partial<Omit<Profile, "id" | "createdAt" | "updatedAt">>) {
    const existing = (await this.getProfile(userId)) as Profile;
    const profile: Profile = {
      ...existing,
      firstName: patch.firstName ?? existing.firstName,
      university: patch.university ?? existing.university,
      accommodationSlug: patch.accommodationSlug !== undefined ? patch.accommodationSlug : existing.accommodationSlug,
      defaultPostcode: patch.defaultPostcode !== undefined ? patch.defaultPostcode : existing.defaultPostcode,
      onboardingComplete: patch.onboardingComplete ?? existing.onboardingComplete,
      updatedAt: new Date().toISOString(),
    };
    this.delta.profile = profile;
    this.commit();
    return profile;
  }

  async listChecklistItems() {
    return [...this.base.items];
  }
  async getChecklistItem(id: string) {
    return this.base.items.find((i) => i.id === id) ?? null;
  }
  private view(item: ChecklistItem): ChecklistView {
    const d = this.delta.statuses[item.id];
    return { ...item, status: d?.s ?? defaultStatusFromTiming(item.timing), qty: d?.q ?? item.defaultQty, customNotes: d?.n ?? "", updatedAt: d?.t ?? null };
  }
  async listUserChecklist() {
    return this.base.items.map((i) => this.view(i));
  }
  async getUserChecklistItem(_userId: string, checklistItemId: string) {
    const item = await this.getChecklistItem(checklistItemId);
    return item ? this.view(item) : null;
  }
  async setChecklistStatus(userId: string, checklistItemId: string, status: ChecklistStatus, patch: { qty?: number; customNotes?: string } = {}): Promise<UserChecklistEntry> {
    const item = await this.getChecklistItem(checklistItemId);
    if (!item) throw new Error("Checklist item not found");
    const prev = this.delta.statuses[checklistItemId];
    const t = new Date().toISOString();
    const next = { s: status, q: patch.qty ?? prev?.q, n: patch.customNotes ?? prev?.n, t };
    if (next.q === undefined) delete next.q;
    if (!next.n) delete next.n;
    this.delta.statuses[checklistItemId] = next;
    this.commit();
    return { id: `${userId}:${checklistItemId}`, userId, checklistItemId, status, qty: next.q ?? item.defaultQty, customNotes: next.n ?? "", updatedAt: t };
  }

  async listAccommodations() {
    return [...this.base.accommodations].sort((a, b) => a.name.localeCompare(b.name));
  }
  async getAccommodation(slug: string) {
    return this.base.accommodations.find((a) => a.slug === slug) ?? null;
  }

  async getBudget() {
    return this.delta.budget;
  }
  async setBudget(userId: string, amount: number, name = "Move-in budget") {
    const budget: Budget = { id: randomUUID(), userId, name, amount, currency: "GBP", createdAt: new Date().toISOString() };
    this.delta.budget = budget;
    this.commit();
    return budget;
  }

  async listBasket() {
    return [...this.delta.basket];
  }
  async addToBasket(userId: string, product: ProductSearchResult, quantity: number, checklistItemId: string | null) {
    const existing = this.delta.basket.find((b) => b.productSnapshot.id === product.id);
    if (existing) {
      existing.quantity += quantity;
      this.commit();
      return { ...existing };
    }
    const line: BasketItem = { id: randomUUID(), userId, checklistItemId, productSnapshot: compactSnapshot(product), quantity, addedAt: new Date().toISOString() };
    this.delta.basket.push(line);
    this.commit();
    return line;
  }
  async removeFromBasket(_userId: string, basketItemId: string) {
    this.delta.basket = this.delta.basket.filter((b) => b.id !== basketItemId);
    this.commit();
  }

  async listPurchases() {
    return [...this.delta.purchases].sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt));
  }
  async addPurchase(userId: string, purchase: Omit<Purchase, "id" | "userId" | "purchasedAt"> & { purchasedAt?: string }) {
    const p: Purchase = { id: randomUUID(), userId, purchasedAt: purchase.purchasedAt ?? new Date().toISOString(), ...purchase, productSnapshot: purchase.productSnapshot ? compactSnapshot(purchase.productSnapshot) : null };
    this.delta.purchases.push(p);
    this.commit();
    return p;
  }
}

/** Drop bulky, non-essential fields so basket/purchase snapshots stay cookie-sized. */
export function compactSnapshot(p: ProductSearchResult): ProductSearchResult {
  return { ...p, description: p.description.slice(0, 80), imageUrl: null, merchantUrl: null };
}
