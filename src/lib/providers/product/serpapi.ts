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
        location: input.location?.label?.includes("Warwick") || !input.location ? "Coventry, England, United Kingdom" : input.location.label,
        num: String(Math.min(input.limit ?? 10, 20)),
        api_key: this.apiKey,
      });
      if (input.maxPrice) params.set("tbs", `mr:1,price:1,ppr_max:${Math.ceil(input.maxPrice)}`);
      const res = await this.fetchImpl(`https://serpapi.com/search.json?${params.toString()}`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(15_000) });
      if (!res.ok) throw new Error(`SerpApi responded ${res.status}`);
      const json = (await res.json()) as { shopping_results?: SerpShoppingResult[]; error?: string };
      if (json.error) throw new Error(`SerpApi error: ${json.error}`);
      const now = new Date().toISOString();
      const results = (json.shopping_results ?? [])
        .filter((r) => typeof r.extracted_price === "number" && r.title)
        .map((r, i): ProductSearchResult => {
          const delivery = parseDelivery(r.delivery);
          const price = r.extracted_price as number;
          const text = `${r.title} ${r.snippet ?? ""} ${(r.extensions ?? []).join(" ")}`;
          const url = r.product_link ?? r.link ?? "";
          return {
            id: `serpapi-${r.product_id ?? i}`,
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
      return results.filter((r) => !(input.excludedAttributes ?? []).some((a) => r.attributes.includes(a)));
    });
  }
}
