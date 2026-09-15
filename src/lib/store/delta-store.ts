import { randomUUID } from "node:crypto";
import type {
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
import type { DataStore } from "./types";
import { defaultStatusFromTiming } from "./local";
import { generateShareCode } from "@/lib/sharing/code";
import { connectionMethodFor } from "@/lib/stores/known-api";

/** Everything a demo user has changed, kept small enough to live in cookies. */
export interface UserDelta {
  v: 1;
  profile: Profile | null;
  statuses: Record<string, { s: ChecklistStatus; q?: number; n?: string; b?: string; t: string }>;
  budget: Budget | null;
  basket: BasketItem[];
  purchases: Purchase[];
  priceWatches: PriceWatch[];
  shares: SharedAccess[];
  invites: ShareInvite[];
  contributions: Contribution[];
  /** Items the student added themselves - optional so cookies saved before
   * this field existed still decode fine (treated as an empty list). */
  customItems?: ChecklistItem[];
  storeConnections?: StoreConnection[];
}

export function emptyDelta(): UserDelta {
  return { v: 1, profile: null, statuses: {}, budget: null, basket: [], purchases: [], priceWatches: [], shares: [], invites: [], contributions: [], customItems: [] };
}

/**
 * DataStore over read-only base data plus a per-user delta. Used for the demo on
 * serverless hosts where no filesystem is shared between functions: the delta is
 * persisted by the caller (cookies) through `onChange`.
 *
 * Like LocalStore, this only ever serves one real identity (LOCAL_DEMO_USER_ID -
 * see src/lib/auth.ts), so parent sharing here is the same self-preview as
 * LocalStore's: redeeming an invite makes the owner and viewer the same person.
 * See LocalStore's docstring on redeemInvite and HANDOFF.md.
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
    return this.delta.profile ?? { id: userId, firstName: this.defaults.firstName, university: "University of Warwick", universityLocation: null, yearOfStudy: null, accommodationSlug: null, defaultPostcode: null, moveInDate: null, notifyPriceAlerts: true, notifyVoucherExpiry: true, notifyWeeklyDigest: false, onboardingComplete: false, termsAcceptedAt: null, termsVersion: null, createdAt: now, updatedAt: now };
  }
  async upsertProfile(userId: string, patch: Partial<Omit<Profile, "id" | "createdAt" | "updatedAt">>) {
    const existing = (await this.getProfile(userId)) as Profile;
    const profile: Profile = {
      ...existing,
      firstName: patch.firstName ?? existing.firstName,
      university: patch.university ?? existing.university,
      universityLocation: patch.universityLocation !== undefined ? patch.universityLocation : existing.universityLocation,
      yearOfStudy: patch.yearOfStudy !== undefined ? patch.yearOfStudy : existing.yearOfStudy,
      termsAcceptedAt: patch.termsAcceptedAt !== undefined ? patch.termsAcceptedAt : existing.termsAcceptedAt,
      termsVersion: patch.termsVersion !== undefined ? patch.termsVersion : existing.termsVersion,
      accommodationSlug: patch.accommodationSlug !== undefined ? patch.accommodationSlug : existing.accommodationSlug,
      defaultPostcode: patch.defaultPostcode !== undefined ? patch.defaultPostcode : existing.defaultPostcode,
      moveInDate: patch.moveInDate !== undefined ? patch.moveInDate : existing.moveInDate,
      notifyPriceAlerts: patch.notifyPriceAlerts ?? existing.notifyPriceAlerts,
      notifyVoucherExpiry: patch.notifyVoucherExpiry ?? existing.notifyVoucherExpiry,
      notifyWeeklyDigest: patch.notifyWeeklyDigest ?? existing.notifyWeeklyDigest,
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
    return this.base.items.find((i) => i.id === id) ?? (this.delta.customItems ?? []).find((i) => i.id === id) ?? null;
  }
  async addCustomChecklistItem(userId: string, input: { category: string; item: string; qty?: number; notes?: string; priority?: Priority; timing?: Timing; budgetEstimate?: number | null }) {
    const item: ChecklistItem = {
      id: randomUUID(),
      sourceKey: `custom/${randomUUID()}`,
      category: input.category,
      item: input.item,
      priority: input.priority ?? "recommended",
      timing: input.timing ?? "buy_before",
      defaultQty: input.qty ?? 1,
      budgetEstimate: input.budgetEstimate ?? null,
      notes: input.notes ?? "",
      custom: true,
      ownerId: userId,
    };
    this.delta.customItems = [...(this.delta.customItems ?? []), item];
    this.commit();
    return item;
  }
  private view(item: ChecklistItem): ChecklistView {
    const d = this.delta.statuses[item.id];
    return { ...item, status: d?.s ?? defaultStatusFromTiming(item.timing), qty: d?.q ?? item.defaultQty, customNotes: d?.n ?? "", box: d?.b ?? "", updatedAt: d?.t ?? null };
  }
  async listUserChecklist() {
    return [...this.base.items, ...(this.delta.customItems ?? [])].map((i) => this.view(i));
  }
  async getUserChecklistItem(_userId: string, checklistItemId: string) {
    const item = await this.getChecklistItem(checklistItemId);
    return item ? this.view(item) : null;
  }
  async setChecklistStatus(userId: string, checklistItemId: string, status: ChecklistStatus, patch: { qty?: number; customNotes?: string; box?: string } = {}): Promise<UserChecklistEntry> {
    const item = await this.getChecklistItem(checklistItemId);
    if (!item) throw new Error("Checklist item not found");
    const prev = this.delta.statuses[checklistItemId];
    const t = new Date().toISOString();
    const next = { s: status, q: patch.qty ?? prev?.q, n: patch.customNotes ?? prev?.n, b: patch.box ?? prev?.b, t };
    if (next.q === undefined) delete next.q;
    if (!next.n) delete next.n;
    if (!next.b) delete next.b;
    this.delta.statuses[checklistItemId] = next;
    this.commit();
    return { id: `${userId}:${checklistItemId}`, userId, checklistItemId, status, qty: next.q ?? item.defaultQty, customNotes: next.n ?? "", box: next.b ?? "", updatedAt: t };
  }

  async listAccommodations() {
    return [...this.base.accommodations].sort((a, b) => a.name.localeCompare(b.name));
  }
  async getAccommodation(slug: string) {
    return this.base.accommodations.find((a) => a.slug === slug) ?? null;
  }
  /** Cookie/demo mode has no scraped accommodation_listings dataset -
   * always "no data yet" rather than fabricating or falling back to the
   * Warwick seed data above. */
  async listAccommodationListings() {
    return [];
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
  async addPurchase(userId: string, purchase: Omit<Purchase, "id" | "userId" | "purchasedAt" | "receiptImage"> & { purchasedAt?: string; receiptImage?: string | null }) {
    const { purchasedAt, receiptImage, ...rest } = purchase;
    const p: Purchase = { id: randomUUID(), userId, purchasedAt: purchasedAt ?? new Date().toISOString(), receiptImage: receiptImage ?? null, ...rest, productSnapshot: rest.productSnapshot ? compactSnapshot(rest.productSnapshot) : null };
    this.delta.purchases.push(p);
    this.commit();
    return p;
  }
  async updatePurchase(userId: string, purchaseId: string, patch: { receiptImage?: string | null }) {
    const p = this.delta.purchases.find((x) => x.userId === userId && x.id === purchaseId);
    if (!p) return null;
    if (patch.receiptImage !== undefined) p.receiptImage = patch.receiptImage;
    this.commit();
    return { ...p };
  }

  // ---- Price watch ----
  async listPriceWatches(userId: string) {
    return this.delta.priceWatches.filter((w) => w.userId === userId);
  }
  async getPriceWatch(userId: string, itemKey: string) {
    return this.delta.priceWatches.find((w) => w.userId === userId && w.itemKey === itemKey) ?? null;
  }
  async recordPriceObservation(userId: string, itemKey: string, patch: { label: string; retailer: string; price: number; currency: string; productUrl: string | null }) {
    const now = new Date().toISOString();
    let watch = this.delta.priceWatches.find((w) => w.userId === userId && w.itemKey === itemKey);
    if (!watch) {
      watch = { id: randomUUID(), userId, itemKey, label: patch.label, retailer: patch.retailer, lastPrice: patch.price, currency: patch.currency, productUrl: patch.productUrl, lastCheckedAt: now };
      this.delta.priceWatches.push(watch);
    } else {
      watch.label = patch.label;
      watch.retailer = patch.retailer;
      watch.lastPrice = patch.price;
      watch.currency = patch.currency;
      watch.productUrl = patch.productUrl;
      watch.lastCheckedAt = now;
    }
    this.commit();
    return { ...watch };
  }

  // ---- Parent sharing ----
  // This store, like LocalStore, only ever has one real signed-in identity
  // (LOCAL_DEMO_USER_ID), so redeeming an invite here necessarily makes the
  // owner and viewer the same person - a self-preview of what a parent would
  // see, not real multi-user isolation (that only exists in Supabase mode).
  // This store deliberately allows self-redeem so the flow is demoable. See
  // LocalStore's docstring on redeemInvite and HANDOFF.md.
  async listShares(ownerId: string) {
    return this.delta.shares.filter((s) => s.ownerId === ownerId);
  }
  async listSharedWithMe(viewerId: string): Promise<SharedAccessView[]> {
    const owner = this.delta.profile;
    return this.delta.shares
      .filter((s) => s.viewerId === viewerId)
      .map((s): SharedAccessView => ({ ...s, ownerFirstName: owner?.firstName ?? "", ownerAccommodationSlug: owner?.accommodationSlug ?? null }));
  }
  async revokeShare(ownerId: string, viewerId: string) {
    this.delta.shares = this.delta.shares.filter((s) => !(s.ownerId === ownerId && s.viewerId === viewerId));
    this.commit();
  }
  async createInvite(ownerId: string, opts: { canViewChecklist: boolean; canViewBudget: boolean; expiresInHours: number }) {
    const invite: ShareInvite = {
      id: randomUUID(),
      ownerId,
      code: generateShareCode(),
      canViewChecklist: opts.canViewChecklist,
      canViewBudget: opts.canViewBudget,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + opts.expiresInHours * 3_600_000).toISOString(),
      redeemedAt: null,
      redeemedBy: null,
    };
    this.delta.invites.push(invite);
    this.commit();
    return invite;
  }
  async listInvites(ownerId: string) {
    return this.delta.invites.filter((i) => i.ownerId === ownerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async revokeInvite(ownerId: string, inviteId: string) {
    this.delta.invites = this.delta.invites.filter((i) => !(i.ownerId === ownerId && i.id === inviteId));
    this.commit();
  }
  async redeemInvite(viewerId: string, code: string) {
    const invite = this.delta.invites.find((i) => i.code === code);
    if (!invite) throw new Error("This invite link is invalid or has expired.");
    if (invite.redeemedAt) throw new Error("This invite link has already been used.");
    if (Date.parse(invite.expiresAt) < Date.now()) throw new Error("This invite link is invalid or has expired.");
    invite.redeemedAt = new Date().toISOString();
    invite.redeemedBy = viewerId;
    const existing = this.delta.shares.find((s) => s.ownerId === invite.ownerId && s.viewerId === viewerId);
    let share: SharedAccess;
    if (existing) {
      existing.canViewChecklist = invite.canViewChecklist;
      existing.canViewBudget = invite.canViewBudget;
      share = existing;
    } else {
      share = { id: randomUUID(), ownerId: invite.ownerId, viewerId, role: "parent", canViewChecklist: invite.canViewChecklist, canViewBudget: invite.canViewBudget, createdAt: new Date().toISOString() };
      this.delta.shares.push(share);
    }
    this.commit();
    return { ...share };
  }

  // ---- Contributions ("the pot") ----
  async listContributions(ownerId: string) {
    return this.delta.contributions.filter((c) => c.ownerId === ownerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async addContribution(ownerId: string, contributorId: string, contributorName: string, input: { amount: number; note: string; checklistItemId: string | null }) {
    const c: Contribution = { id: randomUUID(), ownerId, contributorId, contributorName, checklistItemId: input.checklistItemId, amount: input.amount, note: input.note, createdAt: new Date().toISOString() };
    this.delta.contributions.push(c);
    this.commit();
    return c;
  }

  // ---- Store connections ----
  async listStoreConnections() {
    return this.delta.storeConnections ?? [];
  }
  async connectStore(userId: string, retailer: string) {
    const existing = (this.delta.storeConnections ?? []).find((c) => c.retailer.toLowerCase() === retailer.toLowerCase());
    if (existing) return existing;
    const conn: StoreConnection = { id: randomUUID(), userId, retailer, method: connectionMethodFor(retailer), connectedAt: new Date().toISOString() };
    this.delta.storeConnections = [...(this.delta.storeConnections ?? []), conn];
    this.commit();
    return conn;
  }
  async disconnectStore(_userId: string, retailer: string) {
    this.delta.storeConnections = (this.delta.storeConnections ?? []).filter((c) => c.retailer.toLowerCase() !== retailer.toLowerCase());
    this.commit();
  }
}

/** Drop bulky, non-essential fields so basket/purchase snapshots stay cookie-sized. */
export function compactSnapshot(p: ProductSearchResult): ProductSearchResult {
  return { ...p, description: p.description.slice(0, 80), imageUrl: null, merchantUrl: null };
}
