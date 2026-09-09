import type { ChecklistStatus, Priority, Timing } from "@/lib/types";

/** Minimal RFC 4180 CSV parser: handles quoted fields, escaped quotes and CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

export interface ChecklistCsvRow {
  sourceKey: string;
  category: string;
  item: string;
  priority: Priority;
  timing: Timing;
  defaultQty: number;
  budgetEstimate: number | null;
  bought: boolean;
  packed: boolean;
  notes: string;
}

const REQUIRED_COLUMNS = ["Category", "Item", "Priority", "When", "Qty"] as const;

export function normalisePriority(value: string): Priority {
  const v = value.trim().toLowerCase();
  if (v.startsWith("ess") || v === "must" || v === "high") return "essential";
  if (v.startsWith("rec") || v === "medium" || v === "should") return "recommended";
  return "optional";
}

export function normaliseTiming(value: string): Timing {
  const v = value.trim().toLowerCase();
  if (v.includes("home")) return "take_from_home";
  if (v.includes("wait") || v.includes("arrival")) return "wait_until_arrival";
  if (v.includes("do not") || v.includes("don't") || v.includes("dont")) return "do_not_buy_yet";
  return "buy_before";
}

export function parseYesNo(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === "yes" || v === "y" || v === "true" || v === "1" || v === "x" || v === "✓";
}

export function parseMoney(value: string | undefined): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[£,\s]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Stable key so re-imports update rather than duplicate. */
export function makeSourceKey(category: string, item: string): string {
  return `${slugify(category)}/${slugify(item)}`;
}

export function parseChecklistCsv(text: string): ChecklistCsvRow[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  const idx = (name: string) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  for (const col of REQUIRED_COLUMNS) {
    if (idx(col) === -1) throw new Error(`CSV is missing required column "${col}"`);
  }
  const iCategory = idx("Category");
  const iItem = idx("Item");
  const iPriority = idx("Priority");
  const iWhen = idx("When");
  const iQty = idx("Qty");
  const iBudget = header.findIndex((h) => h.toLowerCase().startsWith("budget"));
  const iBought = idx("Bought?");
  const iPacked = idx("Packed?");
  const iNotes = idx("Notes");

  const out: ChecklistCsvRow[] = [];
  const seen = new Set<string>();
  for (const r of rows.slice(1)) {
    const category = (r[iCategory] ?? "").trim();
    const item = (r[iItem] ?? "").trim();
    if (!item) continue; // blank row
    let sourceKey = makeSourceKey(category || "uncategorised", item);
    // Preserve duplicates rather than silently dropping rows.
    let n = 2;
    while (seen.has(sourceKey)) sourceKey = `${makeSourceKey(category, item)}-${n++}`;
    seen.add(sourceKey);
    const qtyRaw = Number((r[iQty] ?? "").trim());
    out.push({
      sourceKey,
      category: category || "Uncategorised",
      item,
      priority: normalisePriority(r[iPriority] ?? ""),
      timing: normaliseTiming(r[iWhen] ?? ""),
      defaultQty: Number.isFinite(qtyRaw) && qtyRaw > 0 ? Math.round(qtyRaw) : 1,
      budgetEstimate: iBudget >= 0 ? parseMoney(r[iBudget]) : null,
      bought: iBought >= 0 ? parseYesNo(r[iBought]) : false,
      packed: iPacked >= 0 ? parseYesNo(r[iPacked]) : false,
      notes: iNotes >= 0 ? (r[iNotes] ?? "").trim() : "",
    });
  }
  return out;
}

/** First-import status for a user: explicit Bought/Packed flags win, otherwise infer from timing. */
export function initialStatusFor(row: Pick<ChecklistCsvRow, "bought" | "packed" | "timing">): ChecklistStatus {
  if (row.packed) return "packed";
  if (row.bought) return "bought";
  switch (row.timing) {
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
