import type { AccommodationProfile, ChecklistItem, OfferResult, ProductSearchResult, StoreResult } from "@/lib/types";
import { checkProductCompatibility } from "@/lib/ranking/compatibility";
import { priceWithOffers } from "@/lib/offers/discount";
import { retailerKey } from "@/lib/offers/discount";

export interface ScoredProduct {
  product: ProductSearchResult;
  score: number;
  effectivePrice: number;
  warnings: string[];
  nearbyStore: StoreResult | null;
  verifiedOffer: OfferResult | null;
  unverifiedOffer: OfferResult | null;
  reasons: string[];
}

export interface RankingContext {
  item: Pick<ChecklistItem, "item" | "category">;
  profile: AccommodationProfile | null;
  offers?: OfferResult[];
  stores?: StoreResult[];
  now?: Date;
}

const CREDIBLE_RETAILERS = new Set(
  ["argos", "dunelm", "ikea", "tesco", "sainsburys", "boots", "superdrug", "bm", "bandm", "homebargains", "primark", "johnlewis", "amazon", "currys", "wilko", "asda", "morrisons", "therange", "marksandspencer", "next", "very"].map(retailerKey),
);

function clamp(n: number, lo = 0, hi = 1) {
  return Math.max(lo, Math.min(hi, n));
}

export function findNearbyStore(product: ProductSearchResult, stores: StoreResult[] = []): StoreResult | null {
  const key = retailerKey(product.retailer);
  const matches = stores.filter((s) => (s.retailerKey && retailerKey(s.retailerKey) === key) || retailerKey(s.name).includes(key));
  if (matches.length === 0) return null;
  return matches.sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity))[0];
}

/** Scores compatible products 0..1. Hard exclusions are applied first and are not scoreable. */
export function scoreProducts(products: ProductSearchResult[], ctx: RankingContext): { ranked: ScoredProduct[]; excluded: Array<{ product: ProductSearchResult; reason: string }> } {
  const now = ctx.now ?? new Date();
  const offers = ctx.offers ?? [];
  const excluded: Array<{ product: ProductSearchResult; reason: string }> = [];
  const candidates: ScoredProduct[] = [];

  for (const product of products) {
    const verdict = checkProductCompatibility(ctx.item, product, ctx.profile);
    if (!verdict.ok) {
      excluded.push({ product, reason: verdict.reason });
      continue;
    }
    const pricing = priceWithOffers(product.totalPrice, product.retailer, offers, now);
    candidates.push({
      product,
      score: 0,
      effectivePrice: pricing.estimatedAfterVerified,
      warnings: verdict.warnings,
      nearbyStore: findNearbyStore(product, ctx.stores),
      verifiedOffer: pricing.verifiedOffer,
      unverifiedOffer: pricing.unverifiedOffer,
      reasons: [],
    });
  }
  if (candidates.length === 0) return { ranked: [], excluded };

  const minPrice = Math.min(...candidates.map((c) => c.effectivePrice));

  for (const c of candidates) {
    const p = c.product;
    const reasons: string[] = [];
    // Price: ratio to the cheapest compatible option (1 = cheapest, 0.5 = twice the price).
    const priceScore = c.effectivePrice <= 0 ? 1 : clamp(minPrice / c.effectivePrice);
    // Rating: weight by review count; unknown rating scores neutral.
    let ratingScore = 0.5;
    if (typeof p.rating === "number") {
      const confidence = clamp(Math.log10((p.reviewCount ?? 1) + 1) / 3);
      ratingScore = 0.5 + (clamp(p.rating / 5) - 0.5) * (0.4 + 0.6 * confidence);
      if (p.rating >= 4.3 && (p.reviewCount ?? 0) >= 50) reasons.push("Well reviewed");
    }
    const credible = CREDIBLE_RETAILERS.has(retailerKey(p.retailer));
    const credibilityScore = credible ? 1 : 0.4;
    const deliveryScore = typeof p.deliveryDays === "number" ? clamp(1 - p.deliveryDays / 7) : 0.5;
    const proximityScore = c.nearbyStore ? clamp(1 - (c.nearbyStore.distanceMeters ?? 5000) / 10000) : 0.3;
    if (c.nearbyStore) reasons.push(`Store nearby: ${c.nearbyStore.name}`);
    const voucherScore = c.verifiedOffer ? 1 : c.unverifiedOffer ? 0.6 : 0.4;
    if (c.verifiedOffer) reasons.push(`Verified offer: ${c.verifiedOffer.title}`);
    const returnsScore = credible ? 0.8 : 0.4;
    const warningPenalty = c.warnings.length * 0.05;

    c.score = clamp(
      priceScore * 0.3 +
        ratingScore * 0.25 +
        credibilityScore * 0.12 +
        deliveryScore * 0.08 +
        proximityScore * 0.08 +
        voucherScore * 0.1 +
        returnsScore * 0.07 -
        warningPenalty,
    );
    if (c.effectivePrice === minPrice) reasons.push("Lowest total price");
    c.reasons = reasons;
  }

  candidates.sort((a, b) => b.score - a.score || a.effectivePrice - b.effectivePrice);
  return { ranked: candidates, excluded };
}

export interface Recommendations {
  cheapest: ScoredProduct | null;
  bestValue: ScoredProduct | null;
  nearby: ScoredProduct | null;
  excluded: Array<{ product: ProductSearchResult; reason: string }>;
  all: ScoredProduct[];
}

/** Cheapest / best value / nearby. Returns fewer picks rather than inventing choices. */
export function pickRecommendations(products: ProductSearchResult[], ctx: RankingContext): Recommendations {
  const { ranked, excluded } = scoreProducts(products, ctx);
  if (ranked.length === 0) return { cheapest: null, bestValue: null, nearby: null, excluded, all: [] };
  const cheapest = [...ranked].sort((a, b) => a.effectivePrice - b.effectivePrice || b.score - a.score)[0];
  const bestValue = ranked[0];
  const nearbyCandidates = ranked.filter((c) => c.nearbyStore).sort((a, b) => (a.nearbyStore!.distanceMeters ?? Infinity) - (b.nearbyStore!.distanceMeters ?? Infinity) || b.score - a.score);
  const bestValueFinal = bestValue === cheapest ? (ranked.find((c) => c !== cheapest) ?? null) : bestValue;
  // Nearby must be a distinct third option; otherwise show fewer picks rather than repeating one.
  const nearby = nearbyCandidates.find((c) => c !== cheapest && c !== bestValueFinal) ?? null;
  return { cheapest, bestValue: bestValueFinal, nearby, excluded, all: ranked };
}
