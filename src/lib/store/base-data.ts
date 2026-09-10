import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { parseChecklistCsv } from "@/lib/checklist/csv";
import type { AccommodationProfile, ChecklistItem } from "@/lib/types";
import { DEFAULT_ACCOMMODATIONS, DEFAULT_CSV, loadAccommodationSeeds } from "./seed";

/** Stable id derived from the source key so every server instance agrees without a database. */
export function checklistItemIdFor(sourceKey: string): string {
  return `ci_${createHash("sha1").update(sourceKey).digest("hex").slice(0, 20)}`;
}

export interface BaseData {
  items: ChecklistItem[];
  accommodations: AccommodationProfile[];
}

const g = globalThis as unknown as { __awBaseData?: BaseData };

/** Read-only base checklist + accommodation profiles from the data files (cached per instance). */
export function loadBaseData(csvPath = DEFAULT_CSV, accommodationsPath = DEFAULT_ACCOMMODATIONS): BaseData {
  if (g.__awBaseData) return g.__awBaseData;
  const rows = parseChecklistCsv(readFileSync(csvPath, "utf8"));
  const items: ChecklistItem[] = rows.map((r) => ({
    id: checklistItemIdFor(r.sourceKey),
    sourceKey: r.sourceKey,
    category: r.category,
    item: r.item,
    priority: r.priority,
    timing: r.timing,
    defaultQty: r.defaultQty,
    budgetEstimate: r.budgetEstimate,
    notes: r.notes,
    custom: false,
    ownerId: null,
  }));
  const accommodations: AccommodationProfile[] = loadAccommodationSeeds(accommodationsPath).map((a) => ({ id: `acc_${a.slug}`, ...a }));
  g.__awBaseData = { items, accommodations };
  return g.__awBaseData;
}
