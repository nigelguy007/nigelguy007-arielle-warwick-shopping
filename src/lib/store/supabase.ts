import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AccommodationProfile,
  BasketItem,
  Budget,
  ChecklistItem,
  ChecklistStatus,
  ChecklistView,
  Contribution,
  Profile,
  ProductSearchResult,
  Purchase,
  SharedAccess,
  ShareInvite,
  UserChecklistEntry,
} from "@/lib/types";
import type { AccommodationSeed, AdminStore, ChecklistImportRow, DataStore } from "./types";
import { defaultStatusFromTiming } from "./local";
import { generateShareCode } from "@/lib/sharing/code";

type Row = Record<string, unknown>;

const s = (v: unknown) => (v == null ? "" : String(v));
const n = (v: unknown) => (v == null ? null : Number(v));

function toChecklistItem(r: Row): ChecklistItem {
  return {
    id: s(r.id),
    sourceKey: s(r.source_key),
    category: s(r.category),
    item: s(r.item),
    priority: r.priority as ChecklistItem["priority"],
    timing: r.timing as ChecklistItem["timing"],
    defaultQty: Number(r.default_qty ?? 1),
    budgetEstimate: n(r.budget_estimate),
    notes: s(r.notes),
  };
}
function toEntry(r: Row): UserChecklistEntry {
  return { id: s(r.id), userId: s(r.user_id), checklistItemId: s(r.checklist_item_id), status: r.status as ChecklistStatus, qty: Number(r.qty ?? 1), customNotes: s(r.custom_notes), updatedAt: s(r.updated_at) };
}
function toAccommodation(r: Row): AccommodationProfile {
  return {
    id: s(r.id),
    slug: s(r.slug),
    name: s(r.name),
    officialUrl: s(r.official_url),
    verifiedAt: r.verified_at == null ? null : s(r.verified_at),
    bedSize: (r.bed_size as AccommodationProfile["bedSize"]) ?? null,
    mattressDimensions: r.mattress_dimensions == null ? null : s(r.mattress_dimensions),
    ensuite: r.ensuite == null ? null : Boolean(r.ensuite),
    sharedBathroom: r.shared_bathroom == null ? null : Boolean(r.shared_bathroom),
    kitchenType: r.kitchen_type == null ? null : s(r.kitchen_type),
    hobType: (r.hob_type as AccommodationProfile["hobType"]) ?? null,
    suppliedAppliances: (r.supplied_appliances as string[]) ?? [],
    prohibitedItems: (r.prohibited_items as string[]) ?? [],
    notes: (r.notes as Record<string, unknown>) ?? {},
  };
}
function toProfile(r: Row): Profile {
  return { id: s(r.id), firstName: s(r.first_name), university: s(r.university), accommodationSlug: r.accommodation_slug == null ? null : s(r.accommodation_slug), defaultPostcode: r.default_postcode == null ? null : s(r.default_postcode), onboardingComplete: Boolean(r.onboarding_complete), createdAt: s(r.created_at), updatedAt: s(r.updated_at) };
}
function toBudget(r: Row): Budget {
  return { id: s(r.id), userId: s(r.user_id), name: s(r.name), amount: Number(r.amount), currency: s(r.currency) || "GBP", createdAt: s(r.created_at) };
}
function toBasket(r: Row): BasketItem {
  return { id: s(r.id), userId: s(r.user_id), checklistItemId: r.checklist_item_id == null ? null : s(r.checklist_item_id), productSnapshot: r.product_snapshot as ProductSearchResult, quantity: Number(r.quantity ?? 1), addedAt: s(r.added_at) };
}
function toPurchase(r: Row): Purchase {
  return { id: s(r.id), userId: s(r.user_id), checklistItemId: r.checklist_item_id == null ? null : s(r.checklist_item_id), productSnapshot: (r.product_snapshot as ProductSearchResult) ?? null, retailer: s(r.retailer), paidPrice: Number(r.paid_price), voucherUsed: r.voucher_used == null ? null : s(r.voucher_used), purchasedAt: s(r.purchased_at) };
}
function toSharedAccess(r: Row): SharedAccess {
  return { id: s(r.id), ownerId: s(r.owner_id), viewerId: s(r.viewer_id), role: "parent", canViewChecklist: Boolean(r.can_view_checklist), canViewBudget: Boolean(r.can_view_budget), createdAt: s(r.created_at) };
}
function toShareInvite(r: Row): ShareInvite {
  return { id: s(r.id), ownerId: s(r.owner_id), code: s(r.code), canViewChecklist: Boolean(r.can_view_checklist), canViewBudget: Boolean(r.can_view_budget), createdAt: s(r.created_at), expiresAt: s(r.expires_at), redeemedAt: r.redeemed_at == null ? null : s(r.redeemed_at), redeemedBy: r.redeemed_by == null ? null : s(r.redeemed_by) };
}
function toContribution(r: Row): Contribution {
  return { id: s(r.id), ownerId: s(r.owner_id), contributorId: s(r.contributor_id), contributorName: s(r.contributor_name), checklistItemId: r.checklist_item_id == null ? null : s(r.checklist_item_id), amount: Number(r.amount), note: s(r.note), createdAt: s(r.created_at) };
}

function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  if (res.data == null) throw new Error(`${what}: no data`);
  return res.data;
}

/**
 * Supabase-backed store. Pass a client built with the signed-in user's cookies so
 * RLS enforces ownership; pass a secret-key client for AdminStore operations.
 */
export class SupabaseStore implements DataStore, AdminStore {
  readonly kind = "supabase" as const;
  constructor(private readonly db: SupabaseClient) {}

  async getProfile(userId: string) {
    const { data, error } = await this.db.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) throw new Error(`profiles: ${error.message}`);
    return data ? toProfile(data as Row) : null;
  }
  async upsertProfile(userId: string, patch: Partial<Omit<Profile, "id" | "createdAt" | "updatedAt">>) {
    const row: Row = { id: userId, updated_at: new Date().toISOString() };
    if (patch.firstName !== undefined) row.first_name = patch.firstName;
    if (patch.university !== undefined) row.university = patch.university;
    if (patch.accommodationSlug !== undefined) row.accommodation_slug = patch.accommodationSlug;
    if (patch.defaultPostcode !== undefined) row.default_postcode = patch.defaultPostcode;
    if (patch.onboardingComplete !== undefined) row.onboarding_complete = patch.onboardingComplete;
    const res = await this.db.from("profiles").upsert(row, { onConflict: "id" }).select("*").single();
    return toProfile(must(res, "profiles upsert") as Row);
  }

  async listChecklistItems() {
    const res = await this.db.from("checklist_items").select("*").order("category").order("item");
    return (must(res, "checklist_items") as Row[]).map(toChecklistItem);
  }
  async getChecklistItem(id: string) {
    const { data, error } = await this.db.from("checklist_items").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`checklist_items: ${error.message}`);
    return data ? toChecklistItem(data as Row) : null;
  }

  async listUserChecklist(userId: string) {
    const [items, entriesRes] = await Promise.all([this.listChecklistItems(), this.db.from("user_checklist").select("*").eq("user_id", userId)]);
    const entries = new Map((must(entriesRes, "user_checklist") as Row[]).map(toEntry).map((e) => [e.checklistItemId, e]));
    return items.map((i): ChecklistView => {
      const e = entries.get(i.id);
      return { ...i, status: e?.status ?? defaultStatusFromTiming(i.timing), qty: e?.qty ?? i.defaultQty, customNotes: e?.customNotes ?? "", updatedAt: e?.updatedAt ?? null };
    });
  }
  async getUserChecklistItem(userId: string, checklistItemId: string) {
    const all = await this.listUserChecklist(userId);
    return all.find((i) => i.id === checklistItemId) ?? null;
  }
  async setChecklistStatus(userId: string, checklistItemId: string, status: ChecklistStatus, patch: { qty?: number; customNotes?: string } = {}) {
    const row: Row = { user_id: userId, checklist_item_id: checklistItemId, status, updated_at: new Date().toISOString() };
    if (patch.qty !== undefined) row.qty = patch.qty;
    if (patch.customNotes !== undefined) row.custom_notes = patch.customNotes;
    const res = await this.db.from("user_checklist").upsert(row, { onConflict: "user_id,checklist_item_id" }).select("*").single();
    return toEntry(must(res, "user_checklist upsert") as Row);
  }

  async listAccommodations() {
    const res = await this.db.from("accommodation_profiles").select("*").order("name");
    return (must(res, "accommodation_profiles") as Row[]).map(toAccommodation);
  }
  async getAccommodation(slug: string) {
    const { data, error } = await this.db.from("accommodation_profiles").select("*").eq("slug", slug).maybeSingle();
    if (error) throw new Error(`accommodation_profiles: ${error.message}`);
    return data ? toAccommodation(data as Row) : null;
  }

  async getBudget(userId: string) {
    const { data, error } = await this.db.from("budgets").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error(`budgets: ${error.message}`);
    return data ? toBudget(data as Row) : null;
  }
  async setBudget(userId: string, amount: number, name = "Move-in budget") {
    const res = await this.db.from("budgets").insert({ user_id: userId, name, amount, currency: "GBP" }).select("*").single();
    return toBudget(must(res, "budgets insert") as Row);
  }

  async listBasket(userId: string) {
    const res = await this.db.from("basket_items").select("*").eq("user_id", userId).order("added_at");
    return (must(res, "basket_items") as Row[]).map(toBasket);
  }
  async addToBasket(userId: string, product: ProductSearchResult, quantity: number, checklistItemId: string | null) {
    const res = await this.db.from("basket_items").insert({ user_id: userId, checklist_item_id: checklistItemId, product_snapshot: product, quantity }).select("*").single();
    return toBasket(must(res, "basket_items insert") as Row);
  }
  async removeFromBasket(userId: string, basketItemId: string) {
    const { error } = await this.db.from("basket_items").delete().eq("user_id", userId).eq("id", basketItemId);
    if (error) throw new Error(`basket_items delete: ${error.message}`);
  }

  async listPurchases(userId: string) {
    const res = await this.db.from("purchases").select("*").eq("user_id", userId).order("purchased_at", { ascending: false });
    return (must(res, "purchases") as Row[]).map(toPurchase);
  }
  async addPurchase(userId: string, purchase: Omit<Purchase, "id" | "userId" | "purchasedAt"> & { purchasedAt?: string }) {
    const res = await this.db
      .from("purchases")
      .insert({ user_id: userId, checklist_item_id: purchase.checklistItemId, product_snapshot: purchase.productSnapshot, retailer: purchase.retailer, paid_price: purchase.paidPrice, voucher_used: purchase.voucherUsed, purchased_at: purchase.purchasedAt ?? new Date().toISOString() })
      .select("*")
      .single();
    return toPurchase(must(res, "purchases insert") as Row);
  }

  // ---- Parent sharing ----
  async listShares(ownerId: string) {
    const res = await this.db.from("shared_access").select("*").eq("owner_id", ownerId).order("created_at", { ascending: false });
    return (must(res, "shared_access") as Row[]).map(toSharedAccess);
  }
  async listSharedWithMe(viewerId: string) {
    const res = await this.db.from("shared_access").select("*").eq("viewer_id", viewerId).order("created_at", { ascending: false });
    const shares = (must(res, "shared_access") as Row[]).map(toSharedAccess);
    const owners = await Promise.all(shares.map((sh) => this.db.from("profiles").select("first_name, accommodation_slug").eq("id", sh.ownerId).maybeSingle()));
    return shares.map((sh, i) => {
      const p = owners[i].data as Row | null;
      return { ...sh, ownerFirstName: p ? s(p.first_name) : "", ownerAccommodationSlug: p?.accommodation_slug == null ? null : s(p.accommodation_slug) };
    });
  }
  async revokeShare(ownerId: string, viewerId: string) {
    const { error } = await this.db.from("shared_access").delete().eq("owner_id", ownerId).eq("viewer_id", viewerId);
    if (error) throw new Error(`shared_access delete: ${error.message}`);
  }
  async createInvite(ownerId: string, opts: { canViewChecklist: boolean; canViewBudget: boolean; expiresInHours: number }) {
    const expiresAt = new Date(Date.now() + opts.expiresInHours * 3_600_000).toISOString();
    const res = await this.db.from("share_invites").insert({ owner_id: ownerId, code: generateShareCode(), can_view_checklist: opts.canViewChecklist, can_view_budget: opts.canViewBudget, expires_at: expiresAt }).select("*").single();
    return toShareInvite(must(res, "share_invites insert") as Row);
  }
  async listInvites(ownerId: string) {
    const res = await this.db.from("share_invites").select("*").eq("owner_id", ownerId).order("created_at", { ascending: false });
    return (must(res, "share_invites") as Row[]).map(toShareInvite);
  }
  async revokeInvite(ownerId: string, inviteId: string) {
    const { error } = await this.db.from("share_invites").delete().eq("owner_id", ownerId).eq("id", inviteId);
    if (error) throw new Error(`share_invites delete: ${error.message}`);
  }
  /** Routes through the redeem_share_invite() security-definer function so a viewer
   * can write a shared_access row for someone else's owner_id - gated entirely by a
   * valid, unexpired, unredeemed code - without RLS needing to allow that generally. */
  async redeemInvite(_viewerId: string, code: string) {
    const { data, error } = await this.db.rpc("redeem_share_invite", { p_code: code });
    if (error) throw new Error(error.message || "This invite link is invalid or has expired.");
    const row = (Array.isArray(data) ? data[0] : data) as Row | null;
    if (!row) throw new Error("This invite link is invalid or has expired.");
    return toSharedAccess(row);
  }

  // ---- Contributions ("the pot") ----
  async listContributions(ownerId: string) {
    const res = await this.db.from("contributions").select("*").eq("owner_id", ownerId).order("created_at", { ascending: false });
    return (must(res, "contributions") as Row[]).map(toContribution);
  }
  async addContribution(ownerId: string, contributorId: string, contributorName: string, input: { amount: number; note: string; checklistItemId: string | null }) {
    const res = await this.db
      .from("contributions")
      .insert({ owner_id: ownerId, contributor_id: contributorId, contributor_name: contributorName, checklist_item_id: input.checklistItemId, amount: input.amount, note: input.note })
      .select("*")
      .single();
    return toContribution(must(res, "contributions insert") as Row);
  }

  // ---- Admin (secret key client) ----
  async upsertChecklistItems(rows: ChecklistImportRow[]) {
    const existing = await this.db.from("checklist_items").select("source_key");
    const keys = new Set(((existing.data ?? []) as Row[]).map((r) => s(r.source_key)));
    const payload = rows.map((r) => ({ source_key: r.sourceKey, category: r.category, item: r.item, priority: r.priority, timing: r.timing, default_qty: r.defaultQty, budget_estimate: r.budgetEstimate, notes: r.notes }));
    const { error } = await this.db.from("checklist_items").upsert(payload, { onConflict: "source_key" });
    if (error) throw new Error(`checklist_items upsert: ${error.message}`);
    const inserted = rows.filter((r) => !keys.has(r.sourceKey)).length;
    return { inserted, updated: rows.length - inserted };
  }
  async upsertAccommodations(rows: AccommodationSeed[]) {
    const payload = rows.map((r) => ({ slug: r.slug, name: r.name, official_url: r.officialUrl, verified_at: r.verifiedAt, bed_size: r.bedSize, mattress_dimensions: r.mattressDimensions, ensuite: r.ensuite, shared_bathroom: r.sharedBathroom, kitchen_type: r.kitchenType, hob_type: r.hobType, supplied_appliances: r.suppliedAppliances, prohibited_items: r.prohibitedItems, notes: r.notes }));
    const { error } = await this.db.from("accommodation_profiles").upsert(payload, { onConflict: "slug" });
    if (error) throw new Error(`accommodation_profiles upsert: ${error.message}`);
    return rows.length;
  }
  async seedUserStatuses(userId: string, statuses: Array<{ sourceKey: string; status: ChecklistStatus }>, opts: { overwrite?: boolean } = {}) {
    const items = await this.listChecklistItems();
    const byKey = new Map(items.map((i) => [i.sourceKey, i]));
    const existing = await this.db.from("user_checklist").select("checklist_item_id").eq("user_id", userId);
    const have = new Set(((existing.data ?? []) as Row[]).map((r) => s(r.checklist_item_id)));
    const payload = statuses
      .map((st) => ({ item: byKey.get(st.sourceKey), status: st.status }))
      .filter((x): x is { item: ChecklistItem; status: ChecklistStatus } => Boolean(x.item))
      .filter((x) => opts.overwrite || !have.has(x.item.id))
      .map((x) => ({ user_id: userId, checklist_item_id: x.item.id, status: x.status, qty: x.item.defaultQty }));
    if (payload.length === 0) return 0;
    const { error } = await this.db.from("user_checklist").upsert(payload, { onConflict: "user_id,checklist_item_id" });
    if (error) throw new Error(`user_checklist seed: ${error.message}`);
    return payload.length;
  }
}
