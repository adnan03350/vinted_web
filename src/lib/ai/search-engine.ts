export type SearchIntent = {
  query: string;
  normalizedQuery: string;
  productType: string | null;
  budget: number | null;
  brand: string | null;
  color: string | null;
  condition: string | null;
  location: string | null;
  size: string | null;
  gender: string | null;
  material: string | null;
  category: string | null;
  priceRange: { min: number; max: number | null } | null;
  distance: number | null;
  sellerRating: number | null;
  intent: string;
};

export type SearchResult = {
  products: any[];
  suggestions: string[];
  autocomplete: string[];
  conversationalSteps: string[];
  intent: SearchIntent;
  analytics: {
    confidence: number;
    latencyMs: number;
    fallbackUsed: boolean;
  };
};

const synonyms: Record<string, string[]> = {
  laptop: ["computer", "notebook", "ultrabook"],
  chair: ["office chair", "desk chair", "gaming chair"],
  shoes: ["sneakers", "trainers", "running shoes", "sports shoes"],
  phone: ["mobile", "smartphone"],
  camera: ["camcorder", "dslr"],
  bicycle: ["bike"],
  sofa: ["couch", "settee"],
  bag: ["purse", "backpack", "tote"],
};

function normalize(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim();
}

function extractBudget(query: string) {
  const match = query.match(/\$(\d{2,4})|under\s*\$?(\d{2,4})|below\s*\$?(\d{2,4})|budget\s*\$?(\d{2,4})/i);
  if (!match) return null;
  const value = Number(match[1] || match[2] || match[3] || match[4]);
  return isNaN(value) ? null : value;
}

function extractBrand(query: string) {
  const knownBrands = ["nike", "apple", "samsung", "canon", "sony", "gucci", "adidas", "puma", "lenovo", "asus", "dell", "hp", "acer"];
  const match = knownBrands.find((brand) => query.includes(brand));
  return match ? match.charAt(0).toUpperCase() + match.slice(1) : null;
}

function extractCondition(query: string) {
  if (/used|pre-owned|second hand|pre loved/.test(query)) return "Used";
  if (/like new|excellent/.test(query)) return "Like New";
  if (/new|brand new/.test(query)) return "New";
  return null;
}

function extractLocation(query: string) {
  const locations = ["pakistan", "india", "bangladesh", "uae", "saudi", "malaysia", "indonesia", "philippines"];
  const match = locations.find((location) => query.includes(location));
  return match ? match.charAt(0).toUpperCase() + match.slice(1) : null;
}

function extractSize(query: string) {
  const sizeMatch = query.match(/size\s*(\d{2,3})/i);
  return sizeMatch ? sizeMatch[1] : null;
}

function extractGender(query: string) {
  if (/for\s+her|wife|women|female/.test(query)) return "Women";
  if (/for\s+him|men|male/.test(query)) return "Men";
  if (/kids|child|baby/.test(query)) return "Kids";
  return null;
}

function inferCategory(query: string) {
  const tokens = normalize(query).split(" ");
  const categories = ["electronics", "shoes", "bags", "home", "sports", "women", "men", "kids"];
  const match = categories.find((category) => tokens.includes(category));
  return match ? match.charAt(0).toUpperCase() + match.slice(1) : null;
}

function inferIntent(query: string) {
  if (/gift|present/.test(query)) return "gift";
  if (/under|budget|cheap|affordable/.test(query)) return "value";
  if (/good camera|youtube|video/.test(query)) return "content creation";
  if (/programming|coding|work/.test(query)) return "productivity";
  return "discovery";
}

function expandQuery(input: string) {
  const normalized = normalize(input);
  const tokens = normalized.split(" ").filter(Boolean);
  const expansion = new Set<string>();
  tokens.forEach((token) => {
    expansion.add(token);
    if (synonyms[token]) {
      synonyms[token].forEach((value) => expansion.add(value));
    }
  });
  return Array.from(expansion);
}

function scoreProduct(product: any, intent: SearchIntent) {
  const text = `${product.title} ${product.description} ${product.category} ${product.condition}`.toLowerCase();
  const expanded = expandQuery(intent.query);
  const matches = expanded.filter((token) => text.includes(token)).length;
  const brandBoost = intent.brand && product.title.toLowerCase().includes(intent.brand.toLowerCase()) ? 2 : 0;
  const budgetBoost = intent.budget && product.price <= intent.budget ? 2 : 0;
  const conditionBoost = intent.condition && product.condition === intent.condition ? 2 : 0;
  const locationBoost = intent.location && product.country.toLowerCase().includes(intent.location.toLowerCase()) ? 1 : 0;
  const freshnessBoost = product.createdAt ? 1 : 0;
  const ratingBoost = product.sellerRating ? Math.round(product.sellerRating) : 0;
  return matches * 6 + brandBoost + budgetBoost + conditionBoost + locationBoost + freshnessBoost + ratingBoost;
}

export function buildSemanticSearch(query: string, products: any[]): SearchResult {
  const start = performance.now();
  const normalizedQuery = normalize(query);
  const intent: SearchIntent = {
    query,
    normalizedQuery,
    productType: expandQuery(query)[0] || null,
    budget: extractBudget(query),
    brand: extractBrand(query),
    color: /black|white|blue|red|green|pink|brown|gray|gold|silver|purple|beige/.test(query) ? query.match(/black|white|blue|red|green|pink|brown|gray|gold|silver|purple|beige/i)?.[0] || null : null,
    condition: extractCondition(query),
    location: extractLocation(query),
    size: extractSize(query),
    gender: extractGender(query),
    material: /leather|cotton|metal|wood|silk|denim/.test(query) ? query.match(/leather|cotton|metal|wood|silk|denim/i)?.[0] || null : null,
    category: inferCategory(query),
    priceRange: intentBudgetToRange(extractBudget(query)),
    distance: /near me|nearby/.test(query) ? 10 : null,
    sellerRating: null,
    intent: inferIntent(query),
  };

  const scored = products
    .map((product) => ({ product, score: scoreProduct(product, intent) }))
    .sort((a, b) => b.score - a.score);

  const rankedProducts = scored.slice(0, 12).map((entry) => entry.product);

  const suggestions = buildSuggestions(intent, rankedProducts, products);
  const autocomplete = buildAutocomplete(query, products, rankedProducts);
  const conversationalSteps = buildConversationSteps(intent);

  return {
    products: rankedProducts,
    suggestions,
    autocomplete,
    conversationalSteps,
    intent,
    analytics: {
      confidence: Number(Math.min(0.96, 0.6 + rankedProducts.length * 0.03).toFixed(2)),
      latencyMs: Math.round(performance.now() - start),
      fallbackUsed: rankedProducts.length === 0,
    },
  };
}

function intentBudgetToRange(budget: number | null) {
  if (!budget) return null;
  return { min: 0, max: budget };
}

function buildSuggestions(intent: SearchIntent, rankedProducts: any[], products: any[]) {
  const values = [
    `Similar to “${intent.query}”`,
    "Trending nearby",
    "Popular in your region",
    "Recommended for this intent",
  ];
  if (rankedProducts.length > 0) {
    values.push(`Best matches for ${intent.query}`);
  }
  if (products.length > rankedProducts.length) {
    values.push("Alternative options");
  }
  return values;
}

function buildAutocomplete(query: string, products: any[], rankedProducts: any[]) {
  const base = [
    query,
    `${query} under $500`,
    `${query} near me`,
    `${query} in good condition`,
  ];
  const brandHints = products.slice(0, 3).map((product) => product.title);
  return Array.from(new Set([...base, ...brandHints, ...rankedProducts.map((product) => product.title)]));
}

function buildConversationSteps(intent: SearchIntent) {
  const steps = [] as string[];
  if (!intent.budget) steps.push("What is your budget?");
  if (!intent.condition) steps.push("Would you prefer new, like new, or used?");
  if (!intent.location) steps.push("Are you looking for something nearby?");
  if (!intent.brand) steps.push("Do you have a preferred brand?");
  return steps;
}
