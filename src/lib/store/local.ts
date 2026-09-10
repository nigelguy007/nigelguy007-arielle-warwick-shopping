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
  Profile,
  ProductSearchResult,
  Purchase,
  UserChecklistEntry,
} from "@/lib/types";
import type { AccommodationSeed, AdminStore, ChecklistImportRow, DataStore } from "./types";

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
}

const EMPTY: LocalState = { version: 1, profiles: {}, checklistItems: [], userChecklist: [], accommodations: [], budgets: [], basket: [], purchases: [] };

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
      accommodationSlug: patch.accommodationSlug !== undefined ? patch.accommodationSlug : (existing?.accommodationSlug ?? null),
      defaultPostcode: patch.defaultPostcode !== undefined ? patch.defaultPostcode : (existing?.defaultPostcode ?? null),
      onboardingComplete: patch.onboardingComplete ?? existing?.onboardingComplete ?? false,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.state.profiles[userId] = profile;
    this.persist();
    return profile;
  }

  // ---- Base checklist ----
  async listChecklistItems() {
    return [...this.state.checklistItems];
  }
  async getChecklistItem(id: string) {
    return this.state.checklistItems.find((i) => i.id === id) ?? null;
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
    const entries = new Map(this.state.userChecklist.filter((e) => e.userId === userId).map((e) => [e.checklistItemId, e]));
    return this.state.checklistItems.map((i) => this.view(i, entries.get(i.id)));
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
        this.state.checklistItems.push({ id: randomUUID(), ...r });
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
