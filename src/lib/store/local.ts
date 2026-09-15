import { mkdirSync, readFileSync, writeFileSync, existsSync, renameSync } from "node:fs";
import path from "node:path";
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
import type { AccommodationSeed, AdminStore, ChecklistImportRow, DataStore } from "./types";
import { generateShareCode } from "@/lib/sharing/code";
import { checklistItemIdFor } from "./base-data";
import { connectionMethodFor } from "@/lib/stores/known-api";

export const LOCAL_DEMO_USER_ID = "local-demo-user";

interface LocalState {
  version: 1;
  profiles: Record<string, Profile>;
  checklistItems: ChecklistItem[];
  userChecklist: UserChecklistEntry[];
  accommodations: AccommodationProfile[];
  budgets: Budget[];
  basket: BasketItem[];
  purchases: Purchase[];
  priceWatches: PriceWatch[];
  shares: SharedAccess[];
  invites: ShareInvite[];
  contributions: Contribution[];
  storeConnections: StoreConnection[];
}

const EMPTY: LocalState = {
  version: 1,
  profiles: {},
  checklistItems: [],
  userChecklist: [],
  accommodations: [],
  budgets: [],
  basket: [],
  purchases: [],
  priceWatches: [],
  shares: [],
  invites: [],
  contributions: [],
  storeConnections: [],
};

/**
 * File-backed store for development and demos. Persists to <dir>/store.json.
 * Not safe for multiple server instances; that is what Supabase mode is for.
 */
export class LocalStore implements DataStore, AdminStore {
  readonly kind = "local" as const;
  private state: LocalState;
  private readonly file: string;

  constructor(dir: string) {
    mkdirSync(dir, { recursive: true });
    this.file = path.join(dir, "store.json");
    this.state = existsSync(this.file) ? { ...EMPTY, ...(JSON.parse(readFileSync(this.file, "utf8")) as LocalState) } : structuredClone(EMPTY);
  }

  private persist() {
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.state, null, 2));
    renameSync(tmp, this.file);
  }

  get isEmpty() {
    return this.state.checklistItems.length === 0;
  }

  // ---- Profiles ----
  async getProfile(userId: string) {
    return this.state.profiles[userId] ?? null;
  }
  async upsertProfile(userId: string, patch: Partial<Omit<Profile, "id" | "createdAt" | "updatedAt">>) {
    const now = new Date().toISOString();
    const existing = this.state.profiles[userId];
    const profile: Profile = {
      id: userId,
      firstName: patch.firstName ?? existing?.firstName ?? "",
      university: patch.university ?? existing?.university ?? "University of Warwick",
      universityLocation: patch.universityLocation !== undefined ? patch.universityLocation : (existing?.universityLocation ?? null),
      yearOfStudy: patch.yearOfStudy !== undefined ? patch.yearOfStudy : (existing?.yearOfStudy ?? null),
      accommodationSlug: patch.accommodationSlug !== undefined ? patch.accommodationSlug : (existing?.accommodationSlug ?? null),
      defaultPostcode: patch.defaultPostcode !== undefined ? patch.defaultPostcode : (existing?.defaultPostcode ?? null),
      moveInDate: patch.moveInDate !== undefined ? patch.moveInDate : (existing?.moveInDate ?? null),
      notifyPriceAlerts: patch.notifyPriceAlerts ?? existing?.notifyPriceAlerts ?? true,
      notifyVoucherExpiry: patch.notifyVoucherExpiry ?? existing?.notifyVoucherExpiry ?? true,
      notifyWeeklyDigest: patch.notifyWeeklyDigest ?? existing?.notifyWeeklyDigest ?? false,
      onboardingComplete: patch.onboardingComplete ?? existing?.onboardingComplete ?? false,
      termsAcceptedAt: patch.termsAcceptedAt !== undefined ? patch.termsAcceptedAt : (existing?.termsAcceptedAt ?? null),
      termsVersion: patch.termsVersion !== undefined ? patch.termsVersion : (existing?.termsVersion ?? null),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.state.profiles[userId] = profile;
    this.persist();
    return profile;
  }

  // ---- Base checklist ----
  async listChecklistItems() {
    return this.state.checklistItems.filter((i) => i.ownerId == null);
  }
  async getChecklistItem(id: string) {
    return this.state.checklistItems.find((i) => i.id === id) ?? null;
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
    this.state.checklistItems.push(item);
    this.persist();
    return item;
  }

  // ---- User checklist ----
  private view(item: ChecklistItem, entry: UserChecklistEntry | undefined): ChecklistView {
    return {
      ...item,
      status: entry?.status ?? defaultStatusFromTiming(item.timing),
      qty: entry?.qty ?? item.defaultQty,
      customNotes: entry?.customNotes ?? "",
      box: entry?.box ?? "",
      updatedAt: entry?.updatedAt ?? null,
    };
  }
  async listUserChecklist(userId: string) {
    const visible = this.state.checklistItems.filter((i) => i.ownerId == null || i.ownerId === userId);
    const entries = new Map(this.state.userChecklist.filter((e) => e.userId === userId).map((e) => [e.checklistItemId, e]));
    return visible.map((i) => this.view(i, entries.get(i.id)));
  }
  async getUserChecklistItem(userId: string, checklistItemId: string) {
    const item = await this.getChecklistItem(checklistItemId);
    if (!item) return null;
    return this.view(item, this.state.userChecklist.find((e) => e.userId === userId && e.checklistItemId === checklistItemId));
  }
  async setChecklistStatus(userId: string, checklistItemId: string, status: ChecklistStatus, patch: { qty?: number; customNotes?: string; box?: string } = {}) {
    const item = await this.getChecklistItem(checklistItemId);
    if (!item) throw new Error("Checklist item not found");
    const now = new Date().toISOString();
    let entry = this.state.userChecklist.find((e) => e.userId === userId && e.checklistItemId === checklistItemId);
    if (!entry) {
      entry = { id: randomUUID(), userId, checklistItemId, status, qty: patch.qty ?? item.defaultQty, customNotes: patch.customNotes ?? "", box: patch.box ?? "", updatedAt: now };
      this.state.userChecklist.push(entry);
    } else {
      entry.status = status;
      if (patch.qty !== undefined) entry.qty = patch.qty;
      if (patch.customNotes !== undefined) entry.customNotes = patch.customNotes;
      if (patch.box !== undefined) entry.box = patch.box;
      entry.updatedAt = now;
    }
    this.persist();
    return { ...entry };
  }

  // ---- Accommodation ----
  async listAccommodations() {
    return [...this.state.accommodations].sort((a, b) => a.name.localeCompare(b.name));
  }
  async getAccommodation(slug: string) {
    return this.state.accommodations.find((a) => a.slug === slug) ?? null;
  }

  // ---- Budget ----
  async getBudget(userId: string) {
    const mine = this.state.budgets.filter((b) => b.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return mine[0] ?? null;
  }
  async setBudget(userId: string, amount: number, name = "Move-in budget") {
    const budget: Budget = { id: randomUUID(), userId, name, amount, currency: "GBP", createdAt: new Date().toISOString() };
    this.state.budgets = [...this.state.budgets.filter((b) => b.userId !== userId), budget];
    this.persist();
    return budget;
  }

  // ---- Basket ----
  async listBasket(userId: string) {
    return this.state.basket.filter((b) => b.userId === userId);
  }
  async addToBasket(userId: string, product: ProductSearchResult, quantity: number, checklistItemId: string | null) {
    const existing = this.state.basket.find((b) => b.userId === userId && b.productSnapshot.id === product.id);
    if (existing) {
      existing.quantity += quantity;
      this.persist();
      return { ...existing };
    }
    const item: BasketItem = { id: randomUUID(), userId, checklistItemId, productSnapshot: product, quantity, addedAt: new Date().toISOString() };
    this.state.basket.push(item);
    this.persist();
    return item;
  }
  async removeFromBasket(userId: string, basketItemId: string) {
    this.state.basket = this.state.basket.filter((b) => !(b.userId === userId && b.id === basketItemId));
    this.persist();
  }

  // ---- Purchases ----
  async listPurchases(userId: string) {
    return this.state.purchases.filter((p) => p.userId === userId).sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt));
  }
  async addPurchase(userId: string, purchase: Omit<Purchase, "id" | "userId" | "purchasedAt" | "receiptImage"> & { purchasedAt?: string; receiptImage?: string | null }) {
    const { purchasedAt, receiptImage, ...rest } = purchase;
    const p: Purchase = { id: randomUUID(), userId, purchasedAt: purchasedAt ?? new Date().toISOString(), receiptImage: receiptImage ?? null, ...rest };
    this.state.purchases.push(p);
    this.persist();
    return p;
  }
  async updatePurchase(userId: string, purchaseId: string, patch: { receiptImage?: string | null }) {
    const p = this.state.purchases.find((x) => x.userId === userId && x.id === purchaseId);
    if (!p) return null;
    if (patch.receiptImage !== undefined) p.receiptImage = patch.receiptImage;
    this.persist();
    return { ...p };
  }

  // ---- Price watch ----
  async listPriceWatches(userId: string) {
    return this.state.priceWatches.filter((w) => w.userId === userId);
  }
  async getPriceWatch(userId: string, itemKey: string) {
    return this.state.priceWatches.find((w) => w.userId === userId && w.itemKey === itemKey) ?? null;
  }
  async recordPriceObservation(userId: string, itemKey: string, patch: { label: string; retailer: string; price: number; currency: string; productUrl: string | null }) {
    const now = new Date().toISOString();
    let watch = this.state.priceWatches.find((w) => w.userId === userId && w.itemKey === itemKey);
    if (!watch) {
      watch = { id: randomUUID(), userId, itemKey, label: patch.label, retailer: patch.retailer, lastPrice: patch.price, currency: patch.currency, productUrl: patch.productUrl, lastCheckedAt: now };
      this.state.priceWatches.push(watch);
    } else {
      watch.label = patch.label;
      watch.retailer = patch.retailer;
      watch.lastPrice = patch.price;
      watch.currency = patch.currency;
      watch.productUrl = patch.productUrl;
      watch.lastCheckedAt = now;
    }
    this.persist();
    return { ...watch };
  }

  // ---- Parent sharing ----
  // Local mode only ever has one real signed-in identity (LOCAL_DEMO_USER_ID), so
  // redeeming an invite here necessarily makes the owner and viewer the same
  // person - a self-preview of what a parent would see, not real multi-user
  // isolation. Unlike SupabaseStore (which routes through the redeem_share_invite
  // RPC and rejects self-redeem), this store deliberately allows it so the flow
  // is demoable without a second account. See HANDOFF.md.
  async listShares(ownerId: string) {
    return this.state.shares.filter((s) => s.ownerId === ownerId);
  }
  async listSharedWithMe(viewerId: string) {
    return this.state.shares
      .filter((s) => s.viewerId === viewerId)
      .map((s): SharedAccessView => {
        const owner = this.state.profiles[s.ownerId];
        return { ...s, ownerFirstName: owner?.firstName ?? "", ownerAccommodationSlug: owner?.accommodationSlug ?? null };
      });
  }
  async revokeShare(ownerId: string, viewerId: string) {
    this.state.shares = this.state.shares.filter((s) => !(s.ownerId === ownerId && s.viewerId === viewerId));
    this.persist();
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
    this.state.invites.push(invite);
    this.persist();
    return invite;
  }
  async listInvites(ownerId: string) {
    return this.state.invites.filter((i) => i.ownerId === ownerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async revokeInvite(ownerId: string, inviteId: string) {
    this.state.invites = this.state.invites.filter((i) => !(i.ownerId === ownerId && i.id === inviteId));
    this.persist();
  }
  async redeemInvite(viewerId: string, code: string) {
    const invite = this.state.invites.find((i) => i.code === code);
    if (!invite) throw new Error("This invite link is invalid or has expired.");
    if (invite.redeemedAt) throw new Error("This invite link has already been used.");
    if (Date.parse(invite.expiresAt) < Date.now()) throw new Error("This invite link is invalid or has expired.");
    invite.redeemedAt = new Date().toISOString();
    invite.redeemedBy = viewerId;
    const existing = this.state.shares.find((s) => s.ownerId === invite.ownerId && s.viewerId === viewerId);
    let share: SharedAccess;
    if (existing) {
      existing.canViewChecklist = invite.canViewChecklist;
      existing.canViewBudget = invite.canViewBudget;
      share = existing;
    } else {
      share = { id: randomUUID(), ownerId: invite.ownerId, viewerId, role: "parent", canViewChecklist: invite.canViewChecklist, canViewBudget: invite.canViewBudget, createdAt: new Date().toISOString() };
      this.state.shares.push(share);
    }
    this.persist();
    return { ...share };
  }

  // ---- Contributions ("the pot") ----
  async listContributions(ownerId: string) {
    return this.state.contributions.filter((c) => c.ownerId === ownerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async addContribution(ownerId: string, contributorId: string, contributorName: string, input: { amount: number; note: string; checklistItemId: string | null }) {
    const c: Contribution = { id: randomUUID(), ownerId, contributorId, contributorName, checklistItemId: input.checklistItemId, amount: input.amount, note: input.note, createdAt: new Date().toISOString() };
    this.state.contributions.push(c);
    this.persist();
    return c;
  }

  // ---- Store connections ----
  async listStoreConnections(userId: string) {
    return this.state.storeConnections.filter((c) => c.userId === userId);
  }
  async connectStore(userId: string, retailer: string) {
    const existing = this.state.storeConnections.find((c) => c.userId === userId && c.retailer.toLowerCase() === retailer.toLowerCase());
    if (existing) return existing;
    const conn: StoreConnection = { id: randomUUID(), userId, retailer, method: connectionMethodFor(retailer), connectedAt: new Date().toISOString() };
    this.state.storeConnections.push(conn);
    this.persist();
    return conn;
  }
  async disconnectStore(userId: string, retailer: string) {
    this.state.storeConnections = this.state.storeConnections.filter((c) => !(c.userId === userId && c.retailer.toLowerCase() === retailer.toLowerCase()));
    this.persist();
  }

  // ---- Admin / seed ----
  async upsertChecklistItems(rows: ChecklistImportRow[]) {
    let inserted = 0;
    let updated = 0;
    for (const r of rows) {
      const existing = this.state.checklistItems.find((i) => i.sourceKey === r.sourceKey);
      if (existing) {
        Object.assign(existing, { category: r.category, item: r.item, priority: r.priority, timing: r.timing, defaultQty: r.defaultQty, budgetEstimate: r.budgetEstimate, notes: r.notes });
        updated++;
      } else {
        this.state.checklistItems.push({ id: checklistItemIdFor(r.sourceKey), ...r, custom: false, ownerId: null });
        inserted++;
      }
    }
    this.persist();
    return { inserted, updated };
  }
  async upsertAccommodations(rows: AccommodationSeed[]) {
    for (const r of rows) {
      const existing = this.state.accommodations.find((a) => a.slug === r.slug);
      if (existing) Object.assign(existing, r);
      else this.state.accommodations.push({ id: randomUUID(), ...r });
    }
    this.persist();
    return rows.length;
  }
  async seedUserStatuses(userId: string, statuses: Array<{ sourceKey: string; status: ChecklistStatus }>, opts: { overwrite?: boolean } = {}) {
    let n = 0;
    for (const s of statuses) {
      const item = this.state.checklistItems.find((i) => i.sourceKey === s.sourceKey);
      if (!item) continue;
      const existing = this.state.userChecklist.find((e) => e.userId === userId && e.checklistItemId === item.id);
      if (existing && !opts.overwrite) continue;
      await this.setChecklistStatus(userId, item.id, s.status);
      n++;
    }
    return n;
  }
  async listProfileUserIds() {
    return Object.keys(this.state.profiles);
  }
}

export function defaultStatusFromTiming(timing: ChecklistItem["timing"]): ChecklistStatus {
  switch (timing) {
    case "buy_before":
      return "buy";
    case "take_from_home":
      return "need";
    case "wait_until_arrival":
      return "wait";
    case "do_not_buy_yet":
      return "do_not_buy";
  }
}
