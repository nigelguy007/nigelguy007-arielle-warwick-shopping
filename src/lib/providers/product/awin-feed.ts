import type { ProductSearchInput, ProductSearchResult } from "@/lib/types";
import type { ProductSearchProvider } from "./types";
import { timed, log } from "@/lib/logger";
import { parseCsv } from "@/lib/checklist/csv";
import { namedCache } from "@/lib/cache";

/**
 * Columns requested from Awin's Create-a-Feed product datafeed download. These are
 * long-stable "Awin Standard" column names published across Awin's product-feed
 * ecosystem (the Create-a-Feed UI, the publisher datafeed download API and
 * third-party SDKs built against it). Not every merchant populates every column -
 * callers must treat all of them as optional.
 */
const FEED_COLUMNS = [
  "aw_product_id",
  "merchant_product_id",
  "product_name",
  "description",
  "aw_deep_link",
  "merchant_deep_link",
  "aw_image_url",
  "merchant_image_url",
  "merchant_name",
  "merchant_id",
  "merchant_category",
  "category_name",
  "search_price",
  "store_price",
  "rrp_price",
  "currency",
  "delivery_cost",
  "in_stock",
  "stock_quantity",
  "last_updated",
  "brand_name",
  "colour",
  "ean",
  "mpn",
].join(",");

/** One row of a downloaded Awin product feed, keyed by the columns above. All values are raw strings. */
type AwinFeedRow = Record<string, string>;

function parseFeedCsv(text: string): AwinFeedRow[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const row: AwinFeedRow = {};
    header.forEach((h, i) => {
      row[h] = (r[i] ?? "").trim();
    });
    return row;
  });
}

function parseNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value.replace(/[£,\s]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

/** "true"/"1"/"yes" -> in stock, "false"/"0"/"no" -> out of stock, anything else -> unknown. Never guessed. */
function stockAvailability(value: string | undefined): string {
  const v = (value ?? "").trim().toLowerCase();
  if (["true", "1", "yes", "in stock", "instock"].includes(v)) return "In stock (per retailer feed)";
  if (["false", "0", "no", "out of stock", "outofstock"].includes(v)) return "Out of stock (per retailer feed)";
  return "Stock status not reported by feed";
}

function tokens(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
}

function textMatches(haystack: string, query: string): boolean {
  const h = haystack.toLowerCase();
  if (h.includes(query.toLowerCase())) return true;
  const qt = tokens(query);
  if (qt.length === 0) return false;
  const ht = new Set(tokens(haystack));
  return qt.every((t) => ht.has(t) || ht.has(t.replace(/s$/, "")));
}

function detectAttributes(text: string): string[] {
  const t = text.toLowerCase();
  const attrs: string[] = [];
  if (t.includes("induction")) attrs.push("induction");
  if (t.includes("not suitable for induction") || t.includes("not induction")) attrs.push("not induction");
  for (const size of ["single", "small double", "double", "king"]) if (t.includes(size)) attrs.push(size);
  if (t.includes("surge")) attrs.push("surge");
  return attrs;
}

/**
 * Awin Create-a-Feed product datafeed adapter (`productdata.awin.com/datafeed/...`).
 *
 * This is a **different Awin API** to `AwinOfferProvider`: it is not the OAuth
 * Publisher API (Bearer token) used for promotions, it is the separate "datafeed
 * download" API key generated from Toolbox > Create-a-Feed in the Awin dashboard.
 * It also does not support ad-hoc keyword search across every advertiser the way a
 * shopping aggregator does - a publisher downloads the *full current catalogue* of
 * each advertiser programme they have joined (identified by a numeric feed id,
 * `fid`) and searches locally. That trades coverage (only the retailers whose feed
 * ids are configured) for stock-accurate, retailer-sourced data - the whole point
 * of this adapter per HANDOFF.md's recommended improvement #5.
 *
 * Each configured feed is downloaded in full and cached in memory for
 * `FEED_CACHE_TTL_MS` rather than re-fetched per search, because these feeds are
 * complete catalogue dumps (thousands to millions of rows) that advertisers
 * typically refresh on the order of hours, not seconds - re-downloading per
 * request would be wasteful and would not make the data any fresher. `checkedAt`
 * on every result reflects when this adapter actually downloaded the feed, not the
 * merchant's own `last_updated` column, so "Checked N minutes/hours ago" in the UI
 * stays honest even on a cache hit.
 */
const FEED_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // Feeds are full catalogue dumps refreshed hourly-to-daily by merchants.

export class AwinFeedProductProvider implements ProductSearchProvider {
  readonly name = "awin-feed";
  constructor(
    private readonly apiKey: string,
    private readonly feedIds: string[],
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async downloadFeed(fid: string): Promise<AwinFeedRow[]> {
    return timed("awin-feed", `download:${fid}`, async () => {
      const url = `https://productdata.awin.com/datafeed/download/apikey/${this.apiKey}/language/en/fid/${fid}/columns/${FEED_COLUMNS}`;
      const res = await this.fetchImpl(url, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) throw new Error(`Awin datafeed responded ${res.status} for feed ${fid}`);
      return parseFeedCsv(await res.text());
    });
  }

  private async getFeedRows(fid: string): Promise<{ rows: AwinFeedRow[]; fetchedAt: number }> {
    const cache = namedCache<AwinFeedRow[]>("awin-product-feed");
    const key = `fid:${fid}`;
    const hit = cache.get(key);
    if (hit) return { rows: hit.value, fetchedAt: hit.storedAt };
    const rows = await this.downloadFeed(fid);
    const entry = cache.set(key, rows, FEED_CACHE_TTL_MS);
    return { rows, fetchedAt: entry.storedAt };
  }

  async search(input: ProductSearchInput): Promise<ProductSearchResult[]> {
    if (this.feedIds.length === 0) return [];

    const batches = await Promise.allSettled(this.feedIds.map((fid) => this.getFeedRows(fid)));
    const ok = batches.filter((b): b is PromiseFulfilledResult<{ rows: AwinFeedRow[]; fetchedAt: number }> => b.status === "fulfilled");
    if (ok.length === 0) {
      const first = batches[0];
      throw first?.status === "rejected" ? first.reason : new Error("Awin datafeed returned no usable feeds");
    }
    for (const b of batches) {
      if (b.status === "rejected") log.warn("awin-feed.partial-failure", { error: b.reason instanceof Error ? b.reason.message : String(b.reason) });
    }

    const locationLabel = input.location?.label ?? "United Kingdom";
    const results: ProductSearchResult[] = [];
    for (const { value: { rows, fetchedAt } } of ok) {
      const checkedAt = new Date(fetchedAt).toISOString();
      for (const row of rows) {
        const title = row.product_name;
        const price = parseNumber(row.search_price ?? row.store_price);
        if (!title || price === undefined) continue; // Never fabricate a price or title.
        const haystack = `${title} ${row.description ?? ""} ${row.merchant_category ?? ""} ${row.category_name ?? ""}`;
        if (!textMatches(haystack, input.query)) continue;

        const delivery = parseNumber(row.delivery_cost) ?? 0;
        const totalPrice = Math.round((price + delivery) * 100) / 100;
        const attributes = detectAttributes(`${title} ${row.description ?? ""}`);
        const previousPrice = parseNumber(row.rrp_price);

        results.push({
          id: `awin-feed-${row.merchant_id ?? "m"}-${row.aw_product_id ?? row.merchant_product_id ?? title}`,
          provider: "awin-feed",
          retailer: row.merchant_name || "Unknown retailer",
          title,
          description: row.description ?? "",
          currentPrice: price,
          previousPrice: previousPrice !== undefined && previousPrice > price ? previousPrice : undefined,
          currency: row.currency || "GBP",
          deliveryPrice: row.delivery_cost !== undefined ? delivery : undefined,
          totalPrice,
          rating: undefined, // Not part of the standard Awin product feed - never fabricated.
          reviewCount: undefined,
          imageUrl: row.aw_image_url || row.merchant_image_url || null,
          productUrl: row.aw_deep_link || row.merchant_deep_link || "",
          merchantUrl: row.merchant_deep_link || null,
          availability: stockAvailability(row.in_stock),
          attributes,
          locationContext: locationLabel,
          checkedAt,
          sourceConfidence: "verified", // Retailer's own feed, not a shopping-search aggregator.
          deliveryDays: undefined, // Not present in the standard feed columns - never guessed.
        });
      }
    }

    return results
      .filter((r) => (input.maxPrice ? r.totalPrice <= input.maxPrice : true))
      .filter((r) => (input.retailerPreference?.length ? input.retailerPreference.some((p) => r.retailer.toLowerCase().includes(p.toLowerCase()) || p.toLowerCase().includes(r.retailer.toLowerCase())) : true))
      .filter((r) => !(input.excludedAttributes ?? []).some((a) => r.attributes.includes(a)))
      .sort((a, b) => a.totalPrice - b.totalPrice)
      .slice(0, input.limit ?? 8);
  }
}
