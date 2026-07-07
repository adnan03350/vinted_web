export function rankProducts(products: any[], signals: Record<string, any>) {
  return [...products]
    .map((product) => {
      let score = 0;
      score += Number(product.price || 0) > 0 ? 1 : 0;
      score += product.condition === "Like New" ? 2 : product.condition === "New" ? 1 : 0;
      score += product.sellerRating ? 2 : 0;
      score += product.featured ? 2 : 0;
      score += signals.favoriteCount ? 1 : 0;
      score += signals.viewCount ? 1 : 0;
      score += signals.freshnessScore ? 1 : 0;
      score += signals.locationScore ? 1 : 0;
      return { product, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.product);
}
