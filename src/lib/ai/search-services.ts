import { buildSemanticSearch } from "@/lib/ai/search-engine";

/**
 * Thin adapter over the semantic search engine. Kept as the single entry point
 * used by the browse UI so search behaviour stays consistent everywhere.
 */
export function searchProducts(query: string, products: any[]) {
  return buildSemanticSearch(query, products);
}
