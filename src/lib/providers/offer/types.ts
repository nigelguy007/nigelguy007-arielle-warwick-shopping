import type { OfferResult, OfferSearchInput } from "@/lib/types";

export interface OfferProvider {
  readonly name: string;
  searchOffers(input: OfferSearchInput): Promise<OfferResult[]>;
}
