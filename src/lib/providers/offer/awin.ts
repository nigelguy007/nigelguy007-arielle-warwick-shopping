import type { OfferResult, OfferSearchInput } from "@/lib/types";
import type { OfferProvider } from "./types";
import { timed } from "@/lib/logger";
import { studentDiscountLinks } from "./student";

interface AwinPromotion {
  promotionId?: number | string;
  advertiser?: { id?: number; name?: string };
  title?: string;
  description?: string;
  terms?: string;
  type?: string;
  voucher?: { code?: string; exclusive?: boolean };
  startDate?: string;
  endDate?: string;
  urlTracking?: string;
  url?: string;
  regions?: Array<{ code?: string; name?: string }>;
}

function parsePercent(text: string): number | null {
  const m = text.match(/(\d{1,2}(?:\.\d)?)\s?%/);
  return m ? Number(m[1]) : null;
}
function parseAmount(text: string): number | null {
  const m = text.match(/£\s?(\d+(?:\.\d{1,2})?)\s*off/i);
  return m ? Number(m[1]) : null;
}
function parseMinSpend(text: string): number | null {
  const m = text.match(/(?:over|min(?:imum)? spend|when you spend)\s*£\s?(\d+(?:\.\d{1,2})?)/i);
  return m ? Number(m[1]) : null;
}

/**
 * Awin Publisher Promotions API adapter. Requires a publisher id + access token
 * (Awin "API token"). Results are UK-filtered and flagged verified only because
 * they come from the network's own feed; expiry is still enforced downstream.
 */
export class AwinOfferProvider implements OfferProvider {
  readonly name = "awin";
  constructor(private readonly publisherId: string, private readonly accessToken: string, private readonly fetchImpl: typeof fetch = fetch) {}

  async searchOffers(input: OfferSearchInput): Promise<OfferResult[]> {
    return timed("awin", "promotions", async () => {
      const res = await this.fetchImpl(`https://api.awin.com/publishers/${this.publisherId}/promotions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.accessToken}`, Accept: "application/json" },
        body: JSON.stringify({
          filters: { regionCodes: [input.region ?? "GB"], status: "active", membership: "joined", exclusiveOnly: false },
          pagination: { page: 1, pageSize: Math.min(input.limit ?? 50, 200) },
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`Awin responded ${res.status}`);
      const json = (await res.json()) as { data?: AwinPromotion[] };
      const now = new Date();
      const checkedAt = now.toISOString();
      let offers = (json.data ?? []).map((p): OfferResult => {
        const text = `${p.title ?? ""} ${p.description ?? ""}`;
        const isVoucher = (p.type ?? "").toLowerCase().includes("voucher") || Boolean(p.voucher?.code);
        return {
          id: `awin-${p.promotionId ?? Math.random().toString(36).slice(2)}`,
          provider: "awin",
          retailer: p.advertiser?.name ?? "Unknown retailer",
          title: p.title ?? "Promotion",
          description: p.description ?? "",
          code: p.voucher?.code ?? null,
          type: isVoucher ? "voucher" : "promotion",
          percentage: parsePercent(text),
          amount: parseAmount(text),
          minSpend: parseMinSpend(text),
          startDate: p.startDate ?? null,
          endDate: p.endDate ?? null,
          terms: p.terms ?? "See retailer terms.",
          source: "Awin",
          sourceUrl: p.urlTracking ?? p.url ?? "",
          checkedAt,
          studentVerificationRequired: /student/i.test(text),
          verified: true,
        };
      });
      if (input.retailer) {
        const r = input.retailer.toLowerCase();
        offers = offers.filter((o) => o.retailer.toLowerCase().includes(r) || r.includes(o.retailer.toLowerCase()));
        offers = [...offers, ...studentDiscountLinks(input.retailer, now)];
      }
      if (input.query) {
        const q = input.query.toLowerCase();
        offers = offers.filter((o) => `${o.title} ${o.description}`.toLowerCase().includes(q) || o.type === "student");
      }
      return offers;
    });
  }
}
