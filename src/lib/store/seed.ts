import { readFileSync } from "node:fs";
import path from "node:path";
import { initialStatusFor, parseChecklistCsv } from "@/lib/checklist/csv";
import type { AccommodationSeed, AdminStore } from "./types";
import type { AccommodationProfile } from "@/lib/types";

export const DEFAULT_CSV = path.join(process.cwd(), "data", "warwick_move_in_checklist.csv");
export const DEFAULT_ACCOMMODATIONS = path.join(process.cwd(), "data", "accommodations.json");

interface RawAccommodation {
  slug: string;
  name: string;
  official_url: string;
  verified_at: string | null;
  bed_size: AccommodationProfile["bedSize"];
  mattress_dimensions: string | null;
  ensuite: boolean | null;
  shared_bathroom: boolean | null;
  kitchen_type: string | null;
  hob_type: AccommodationProfile["hobType"];
  supplied_appliances: string[];
  prohibited_items: string[];
  notes: Record<string, unknown>;
}

export function loadAccommodationSeeds(file = DEFAULT_ACCOMMODATIONS): AccommodationSeed[] {
  const raw = JSON.parse(readFileSync(file, "utf8")) as RawAccommodation[];
  return raw.map((r) => ({
    slug: r.slug,
    name: r.name,
    officialUrl: r.official_url,
    verifiedAt: r.verified_at,
    bedSize: r.bed_size,
    mattressDimensions: r.mattress_dimensions,
    ensuite: r.ensuite,
    sharedBathroom: r.shared_bathroom,
    kitchenType: r.kitchen_type,
    hobType: r.hob_type,
    suppliedAppliances: r.supplied_appliances ?? [],
    prohibitedItems: r.prohibited_items ?? [],
    notes: r.notes ?? {},
  }));
}

export interface SeedResult {
  items: { inserted: number; updated: number; total: number };
  accommodations: number;
  userStatuses: number;
}

/** Idempotent import: base checklist + accommodation profiles, optionally a user's first statuses. */
export async function seedStore(store: AdminStore, opts: { csvPath?: string; accommodationsPath?: string; userId?: string; overwriteStatuses?: boolean } = {}): Promise<SeedResult> {
  const csv = readFileSync(opts.csvPath ?? DEFAULT_CSV, "utf8");
  const rows = parseChecklistCsv(csv);
  const items = await store.upsertChecklistItems(rows.map((r) => ({ sourceKey: r.sourceKey, category: r.category, item: r.item, priority: r.priority, timing: r.timing, defaultQty: r.defaultQty, budgetEstimate: r.budgetEstimate, notes: r.notes })));
  const accommodations = await store.upsertAccommodations(loadAccommodationSeeds(opts.accommodationsPath));
  let userStatuses = 0;
  if (opts.userId) {
    userStatuses = await store.seedUserStatuses(
      opts.userId,
      rows.map((r) => ({ sourceKey: r.sourceKey, status: initialStatusFor(r) })),
      { overwrite: opts.overwriteStatuses },
    );
  }
  return { items: { ...items, total: rows.length }, accommodations, userStatuses };
}
