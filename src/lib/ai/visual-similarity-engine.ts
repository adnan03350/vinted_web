export type VisualFeatures = {
  category: string;
  productType: string;
  primaryColor: string;
  secondaryColors: string[];
  material: string;
  style: string;
  keywords: string[];
  confidence: number;
};

export type VisualMatch = {
  product: any;
  score: number;
};

export type VisualSearchResult = {
  products: any[];
  matches: VisualMatch[];
  features: VisualFeatures;
  confidence: number;
  resultCount: number;
};

function productText(product: any) {
  return `${product.title ?? ""} ${product.description ?? ""} ${product.category ?? ""} ${product.condition ?? ""} ${product.brand ?? ""}`.toLowerCase();
}

function scoreProduct(product: any, features: VisualFeatures) {
  const text = productText(product);
  let score = 0;

  if (features.category && product.category === features.category) score += 5;
  if (features.productType && text.includes(features.productType.toLowerCase())) score += 3;
  if (features.primaryColor && text.includes(features.primaryColor.toLowerCase())) score += 2;
  if (features.material && text.includes(features.material.toLowerCase())) score += 2;
  if (features.style && text.includes(features.style.toLowerCase())) score += 1;

  const keywordMatches = features.keywords.filter((keyword) => keyword && text.includes(keyword.toLowerCase())).length;
  score += keywordMatches * 3;

  return score;
}

/**
 * Rank a product catalog by visual-feature overlap. Reuses the same
 * token-overlap scoring philosophy as the semantic search engine so image
 * search stays consistent with text search.
 */
export function findVisuallySimilar(features: VisualFeatures, products: any[], limit = 12): VisualSearchResult {
  const matches = products
    .map((product) => ({ product, score: scoreProduct(product, features) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const topScore = matches[0]?.score ?? 0;
  const confidence = matches.length
    ? Number(Math.min(0.97, 0.55 + features.confidence * 0.2 + Math.min(0.2, topScore * 0.02)).toFixed(2))
    : 0;

  return {
    products: matches.map((entry) => entry.product),
    matches,
    features,
    confidence,
    resultCount: matches.length,
  };
}
