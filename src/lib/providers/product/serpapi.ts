import type { ProductSearchInput, ProductSearchResult } from "@/lib/types";
import type { ProductSearchProvider } from "./types";
import { timed } from "@/lib/logger";

interface SerpShoppingResult {
  position?: number;
  title?: string;
  product_id?: string;
  link?: string;
  product_link?: string;
  source?: string;
  price?: string;
  extracted_price?: number;
  old_price?: string;
  extracted_old_price?: number;
  rating?: number;
  reviews?: number;
  thumbnail?: string;
  delivery?: string;
  snippet?: string;
  extensions?: string[];
  second_hand_condition?: string;
}

/** Deterministic, non-cryptographic string hash (djb2) - stable across
 * requests, unlike array position, so re-searching the same query gives
 * repeated listings the same id (dedupes/merges basket quantity correctly)
 * without colliding two different listings that happen to land at the same
 * result index on different searches. */
function stableHash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) hash = (hash * 33) ^ input.charCodeAt(i);
  return (hash >>> 0).toString(36);
}

function parseDelivery(text: string | undefined): { price?: number; days?: number } {
  if (!text) return {};
  const t = text.toLowerCase();
  const out: { price?: number; days?: number } = {};
  if (t.includes("free")) out.price = 0;
  const m = t.match(/£\s?(\d+(?:\.\d+)?)/);
  if (m) out.price = Number(m[1]);
  const d = t.match(/(\d+)[- ]?day/);
  if (d) out.days = Number(d[1]);
  return out;
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
 * SerpApi Google Shopping adapter. Localised to the UK; results are marked
 * "unverified" because a shopping aggregator is not the retailer's own feed.
 */
export class SerpApiProductProvider implements ProductSearchProvider {
  readonly name = "serpapi";
  constructor(private readonly apiKey: string, private readonly fetchImpl: typeof fetch = fetch) {}

  async search(input: ProductSearchInput): Promise<ProductSearchResult[]> {
    return timed("serpapi", "shopping", async () => {
      const params = new URLSearchParams({
        engine: "google_shopping",
        q: input.query,
        gl: "uk",
        hl: "en",
        google_domain: "google.co.uk",
        num: String(Math.min(input.limit ?? 10, 20)),
        api_key: this.apiKey,
      });
      // SerpApi wants a plain city name, not our full address-style labels
      // (e.g. "University of Warwick, Coventry CV4 7AL"). With no real
      // location - no coords and not Warwick's own default - omit the param
      // rather than guessing a city; gl:"uk" already scopes results to the UK.
      if (input.location?.label?.includes("Warwick")) {
        params.set("location", "Coventry, England, United Kingdom");
      } else if (input.location?.coords) {
        params.set("location", input.location.label);
      }
      if (input.maxPrice) params.set("tbs", `mr:1,price:1,ppr_max:${Math.ceil(input.maxPrice)}`);
      // A first-time query has to be scraped by Google Shopping and can run
      // past 25s; SerpApi keeps working after the client gives up and serves
      // the same query from its own cache in ~1s, so one retry after a
      // timeout almost always succeeds instead of surfacing "try again".
      const url = `https://serpapi.com/search.json?${params.toString()}`;
      let res: Response;
      try {
        res = await this.fetchImpl(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(25_000) });
      } catch (err) {
        if (!(err instanceof Error && err.name === "TimeoutError")) throw err;
        res = await this.fetchImpl(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(15_000) });
      }
      if (!res.ok) throw new Error(`SerpApi responded ${res.status}`);
      const json = (await res.json()) as { shopping_results?: SerpShoppingResult[]; error?: string };
      if (json.error) throw new Error(`SerpApi error: ${json.error}`);
      const now = new Date().toISOString();
      const results = (json.shopping_results ?? [])
        .filter((r) => typeof r.extracted_price === "number" && r.title)
        .map((r): ProductSearchResult => {
          const delivery = parseDelivery(r.delivery);
          const price = r.extracted_price as number;
          const text = `${r.title} ${r.snippet ?? ""} ${(r.extensions ?? []).join(" ")}`;
          const url = r.product_link ?? r.link ?? "";
          // SerpApi's product_id is only present for some listings (mainly
          // Google Shopping product pages) - most direct retailer links
          // don't have one. Falling back to array index `i` broke basket
          // dedup: search result ordering shifts between calls (ads/ranking
          // change), so re-adding "the same" listing on a later search could
          // collide with whatever different listing now sits at that index,
          // silently bumping the wrong basket line's quantity instead of
          // adding the new product. Hash the retailer+title+link instead -
          // content-addressed, not position-addressed.
          const id = r.product_id ? `serpapi-${r.product_id}` : `serpapi-${stableHash(`${r.source ?? ""}|${r.title}|${url}`)}`;
          return {
            id,
            provider: "serpapi",
            retailer: r.source ?? "Unknown retailer",
            title: r.title as string,
            description: r.snippet ?? (r.extensions ?? []).join(" · "),
            currentPrice: price,
            previousPrice: r.extracted_old_price,
            currency: "GBP",
            deliveryPrice: delivery.price,
            totalPrice: Math.round((price + (delivery.price ?? 0)) * 100) / 100,
            rating: r.rating,
            reviewCount: r.reviews,
            imageUrl: r.thumbnail ?? null,
            productUrl: url,
            merchantUrl: r.link ?? null,
            availability: r.delivery ? `Online: ${r.delivery}` : "Online listing",
            attributes: detectAttributes(text),
            locationContext: input.location?.label ?? "Coventry, United Kingdom",
            checkedAt: now,
            sourceConfidence: "unverified",
            deliveryDays: delivery.days,
          };
        });
      // Google Shopping repeats the same listing (ad + organic slot, or two
      // product ids for one product), which showed up as identical rows in
      // the compare list. Same retailer, title and price is one listing.
      const seen = new Set<string>();
      return results.filter((r) => {
        const key = `${r.retailer}|${r.title}|${r.currentPrice}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return !(input.excludedAttributes ?? []).some((a) => r.attributes.includes(a));
      });
    });
  }
}
