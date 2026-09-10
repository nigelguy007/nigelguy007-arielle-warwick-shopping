import type { AccommodationProfile, ChecklistItem, ProductSearchResult } from "@/lib/types";

export type CompatibilityVerdict =
  | { ok: true; warnings: string[] }
  | { ok: false; reason: string; warnings: string[] };

const BEDDING_WORDS = ["duvet", "sheet", "mattress", "pillowcase", "bedding", "topper"];
const COOKWARE_WORDS = ["pan", "saucepan", "wok", "skillet", "frying", "pot", "casserole", "griddle"];
const APPLIANCE_WORDS = ["kettle", "toaster", "microwave", "fridge", "iron", "hoover", "vacuum", "oven", "grill"];
const FURNITURE_WORDS = ["chair", "desk", "shelf", "shelving", "table", "wardrobe", "drawers", "bookcase", "stool"];

const hasAny = (text: string, words: string[]) => words.some((w) => text.includes(w));

export function categoryOfItem(item: Pick<ChecklistItem, "item" | "category">): "bedding" | "cookware" | "appliance" | "furniture" | "other" {
  const t = `${item.category} ${item.item}`.toLowerCase();
  if (hasAny(t, APPLIANCE_WORDS)) return "appliance";
  if (hasAny(t, BEDDING_WORDS)) return "bedding";
  if (hasAny(t, COOKWARE_WORDS)) return "cookware";
  if (hasAny(t, FURNITURE_WORDS)) return "furniture";
  return "other";
}

export function isSuppliedByHall(item: Pick<ChecklistItem, "item">, profile: AccommodationProfile | null): boolean {
  if (!profile || !profile.verifiedAt) return false;
  const name = item.item.toLowerCase();
  return profile.suppliedAppliances.some((a) => {
    const s = a.toLowerCase();
    return name.includes(s) || s.includes(name);
  });
}

export function isProhibitedByHall(item: Pick<ChecklistItem, "item">, profile: AccommodationProfile | null): boolean {
  if (!profile || !profile.verifiedAt) return false;
  const name = item.item.toLowerCase();
  return profile.prohibitedItems.some((p) => name.includes(p.toLowerCase()));
}

const BED_WORDS: Record<string, string[]> = {
  single: ["single", "3ft", "90cm", "90 cm", "90x190", "90 x 190", "twin"],
  small_double: ["small double", "4ft", "120cm", "120 x 190"],
  double: ["double", "4ft6", "135cm", "135 x 190"],
  king: ["king", "5ft", "150cm", "150 x 200"],
};

function detectedBedSize(product: ProductSearchResult): string | null {
  const text = `${product.title} ${product.description} ${product.attributes.join(" ")}`.toLowerCase();
  // Check more specific sizes first so "small double" is not read as "double".
  for (const size of ["small_double", "king", "double", "single"]) {
    if (BED_WORDS[size].some((w) => text.includes(w))) return size;
  }
  return null;
}

/**
 * Hard compatibility rules. A failure here removes the product entirely — it is
 * never allowed to out-score a compatible product no matter how cheap it is.
 */
export function checkProductCompatibility(
  item: Pick<ChecklistItem, "item" | "category">,
  product: ProductSearchResult,
  profile: AccommodationProfile | null,
): CompatibilityVerdict {
  const warnings: string[] = [];
  const kind = categoryOfItem(item);
  const text = `${product.title} ${product.description} ${product.attributes.join(" ")}`.toLowerCase();

  if (kind === "appliance" && isSuppliedByHall(item, profile)) {
    return { ok: false, reason: "Warwick already provides this", warnings };
  }
  if (isProhibitedByHall(item, profile)) {
    return { ok: false, reason: "Not allowed in this accommodation", warnings };
  }

  if (kind === "cookware") {
    const hob = profile?.verifiedAt ? profile.hobType : null;
    if (hob === "induction") {
      const inductionOk = text.includes("induction") || text.includes("all hob") || text.includes("all hobs") || text.includes("suitable for all");
      const explicitlyNot = text.includes("not suitable for induction") || text.includes("not induction");
      if (!inductionOk || explicitlyNot) {
        return { ok: false, reason: "Not induction-compatible (this kitchen has an induction hob)", warnings };
      }
    } else if (!hob || hob === "unknown") {
      warnings.push("Hob type not confirmed - check the hall kitchen before buying");
    }
  }

  if (kind === "bedding") {
    const bed = profile?.verifiedAt ? profile.bedSize : null;
    const detected = detectedBedSize(product);
    if (bed && bed !== "unknown") {
      if (detected && detected !== bed) {
        return { ok: false, reason: `Wrong bed size (room has a ${bed.replace("_", " ")} bed)`, warnings };
      }
      if (!detected) warnings.push("Size not stated in listing - check it matches your bed");
    } else {
      warnings.push("Bed size not confirmed");
    }
  }

  return { ok: true, warnings };
}

export function accommodationWarningFor(item: Pick<ChecklistItem, "item" | "category">, profile: AccommodationProfile | null): string | null {
  const kind = categoryOfItem(item);
  // No accommodation chosen yet - distinct from "chosen but not officially verified",
  // which is the normal state for every hall until Warwick's page is scraped/confirmed.
  if (!profile) {
    if (kind === "bedding") return "Tell me your Warwick accommodation before I recommend bedding.";
    if (kind === "cookware") return "Hob type not confirmed - check your hall kitchen before buying cookware.";
    if (kind === "appliance") return "Check whether Warwick already provides this before buying.";
    return null;
  }
  if (kind === "appliance" && isSuppliedByHall(item, profile)) return "Warwick already provides this.";
  if (kind === "bedding" && (!profile.verifiedAt || !profile.bedSize || profile.bedSize === "unknown")) return "Bed size not confirmed.";
  if (kind === "cookware" && (!profile.verifiedAt || !profile.hobType || profile.hobType === "unknown")) return "Hob type not confirmed - check your hall kitchen before buying cookware.";
  if (kind === "cookware" && profile.verifiedAt && profile.hobType === "induction") return "Induction hob: only induction-compatible pans will be shown.";
  if (kind === "appliance" && !profile.verifiedAt) return "Check whether Warwick already provides this before buying.";
  return null;
}
