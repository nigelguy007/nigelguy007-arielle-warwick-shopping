import type { ProductSearchInput, ProductSearchResult } from "@/lib/types";

export interface ProductSearchProvider {
  readonly name: string;
  search(input: ProductSearchInput): Promise<ProductSearchResult[]>;
}
