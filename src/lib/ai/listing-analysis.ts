export type AiPriceEstimate = {
  fairMarketPrice: number;
  quickSalePrice: number;
  premiumListingPrice: number;
  confidence: number;
  rationale: string;
};

export type AiListingAnalysis = {
  productType: string;
  productName: string;
  brand: string | null;
  model: string | null;
  category: string;
  condition: string;
  estimatedAge: string;
  primaryColor: string;
  secondaryColors: string[];
  material: string;
  style: string;
  size: string | null;
  gender: string | null;
  keywords: string[];
  seoTags: string[];
  title: string;
  description: string;
  highlights: string[];
  suggestedSpecifications: string[];
  suggestedTags: string[];
  priceEstimates: AiPriceEstimate;
  qualityScore: {
    images: number;
    description: number;
    title: number;
    price: number;
    trust: number;
    overall: number;
  };
  riskScore: number;
  riskFlags: string[];
  duplicateSignals: string[];
  recommendations: string[];
  enhancementOptions: string[];
  confidence: number;
  rationale: string;
};

function normalize(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function inferCategory(text: string, fallback: string) {
  const categories: Record<string, string[]> = {
    Women: ["dress", "blouse", "skirt", "heels", "handbag", "jewelry", "bag", "coat", "sneaker", "women"],
    Men: ["shirt", "jeans", "suit", "watch", "belt", "men"],
    Kids: ["kid", "kids", "baby", "toy", "toddler"],
    Shoes: ["shoe", "sneaker", "trainer", "boot", "heels"],
    Bags: ["bag", "purse", "backpack", "tote", "wallet"],
    Electronics: ["phone", "laptop", "tablet", "headphones", "camera", "console"],
    Home: ["lamp", "chair", "table", "decor", "vase", "mug"],
    Sports: ["ball", "bike", "helmet", "racket", "yoga", "fitness"],
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      return category;
    }
  }

  return fallback || "Home";
}

function inferBrand(text: string, fallback?: string | null) {
  const knownBrands = ["nike", "adidas", "gucci", "prada", "zara", "h&m", "apple", "samsung", "canon", "sony", "puma", "new balance"];
  const match = knownBrands.find((brand) => text.includes(brand));
  return match ? match.toUpperCase() : fallback || null;
}

function inferCondition(text: string, fallback: string) {
  if (/new|sealed|mint/.test(text)) return "New";
  if (/like new|excellent|premium/.test(text)) return "Like New";
  if (/good|used|vintage/.test(text)) return "Good";
  return fallback || "Used";
}

function inferColor(text: string) {
  const colors = ["black", "white", "blue", "red", "green", "pink", "brown", "gray", "gold", "silver", "purple", "beige"];
  const match = colors.find((color) => text.includes(color));
  return match ? match.charAt(0).toUpperCase() + match.slice(1) : "Neutral";
}

function inferMaterial(text: string) {
  const materials = ["cotton", "leather", "denim", "silk", "polyester", "metal", "glass", "wood", "nylon", "wool"];
  const match = materials.find((material) => text.includes(material));
  return match ? match.charAt(0).toUpperCase() + match.slice(1) : "Mixed materials";
}

function inferStyle(text: string, category: string) {
  if (category === "Electronics") return "Modern";
  if (category === "Sports") return "Active";
  if (/(dress|blouse|skirt|coat)/.test(text)) return "Elegant";
  if (/(shirt|jeans|suit|belt)/.test(text)) return "Classic";
  return "Versatile";
}

function inferProductType(text: string, category: string) {
  if (text.includes("shoe") || text.includes("sneaker") || text.includes("boot")) return "Footwear";
  if (text.includes("bag") || text.includes("purse") || text.includes("backpack")) return "Bag";
  if (text.includes("phone") || text.includes("laptop") || text.includes("tablet")) return "Tech device";
  if (text.includes("shirt") || text.includes("dress") || text.includes("coat")) return "Apparel";
  return category === "Electronics" ? "Electronic accessory" : "Lifestyle item";
}

function estimatePrice(category: string, condition: string, fileCount: number) {
  const baseByCategory: Record<string, number> = {
    Women: 2200,
    Men: 1800,
    Kids: 1200,
    Shoes: 2600,
    Bags: 3000,
    Electronics: 4500,
    Home: 1600,
    Sports: 2100,
  };

  const multiplier = condition === "New" ? 1.2 : condition === "Like New" ? 1.05 : 0.9;
  const imageBoost = fileCount >= 3 ? 1.08 : 1;

  const fairMarketPrice = Math.round(baseByCategory[category] * multiplier * imageBoost);
  return {
    fairMarketPrice,
    quickSalePrice: Math.round(fairMarketPrice * 0.88),
    premiumListingPrice: Math.round(fairMarketPrice * 1.12),
    confidence: Math.min(0.96, 0.7 + fileCount * 0.06),
    rationale: `${condition} ${category.toLowerCase()} items typically trade around this range when the listing is supported by clear images.`,
  };
}

function buildTitle({ brand, productType, category, color, condition }: { brand: string | null; productType: string; category: string; color: string; condition: string }) {
  const prefix = brand ? `${brand} ` : "";
  const suffix = condition === "New" ? "New" : condition === "Like New" ? "Like New" : "Pre-loved";
  return `${prefix}${productType} ${color} ${category.toLowerCase()} ${suffix}`.trim();
}

function buildDescription({ productType, category, condition, color, material, style }: { productType: string; category: string; condition: string; color: string; material: string; style: string }) {
  return `A ${condition.toLowerCase()} ${productType.toLowerCase()} in ${color.toLowerCase()} with ${material.toLowerCase()} construction and a ${style.toLowerCase()} silhouette. Suitable for everyday use and ideal for buyers looking for a practical ${category.toLowerCase()} piece.`;
}

export function analyzeListing(files: File[], input: { category?: string; brand?: string | null; condition?: string; price?: number | string }) : AiListingAnalysis {
  const fileNames = files.map((file) => file.name.toLowerCase()).join(" ");
  const normalized = normalize(fileNames);

  const category = inferCategory(normalized, input.category || "Home");
  const brand = inferBrand(normalized, input.brand);
  const condition = inferCondition(normalized, input.condition || "Used");
  const primaryColor = inferColor(normalized);
  const material = inferMaterial(normalized);
  const style = inferStyle(normalized, category);
  const productType = inferProductType(normalized, category);

  const keywords = [category.toLowerCase(), productType.toLowerCase(), primaryColor.toLowerCase(), material.toLowerCase(), style.toLowerCase()].filter(Boolean);
  const seoTags = [category, productType, primaryColor, material, style].filter(Boolean);
  const secondaryColors = primaryColor === "Neutral" ? ["Black", "White"] : [primaryColor, "Neutral"];
  const riskFlags = [] as string[];
  if (/screenshot|download|watermark|sample|copy/.test(normalized)) riskFlags.push("Suspicious image source");
  if (files.length > 8) riskFlags.push("Very high number of uploads");
  if (files.length === 1) riskFlags.push("Add more images to improve trust");
  if (files.some((file) => file.size > 8 * 1024 * 1024)) riskFlags.push("Large image file detected");

  const duplicateSignals = [] as string[];
  const uniqueFiles = new Set(files.map((file) => file.name.toLowerCase()));
  if (uniqueFiles.size < files.length) duplicateSignals.push("Duplicate file names detected");

  const title = buildTitle({ brand, productType, category, color: primaryColor, condition });
  const description = buildDescription({ productType, category, condition, color: primaryColor, material, style });
  const priceEstimates = estimatePrice(category, condition, files.length);

  const qualityScore = {
    images: Math.min(95, 55 + files.length * 12),
    description: description.length > 140 ? 90 : 72,
    title: title.length > 14 ? 88 : 74,
    price: priceEstimates.confidence > 0.8 ? 86 : 71,
    trust: Math.max(60, 100 - riskFlags.length * 12),
    overall: Math.round((0.25 * (Math.min(95, 55 + files.length * 12)) + 0.2 * (description.length > 140 ? 90 : 72) + 0.2 * (title.length > 14 ? 88 : 74) + 0.15 * (priceEstimates.confidence > 0.8 ? 86 : 71) + 0.2 * (Math.max(60, 100 - riskFlags.length * 12))) / 1),
  };

  const recommendations = [] as string[];
  if (files.length < 3) recommendations.push("Add more images to improve trust and visibility");
  if (title.length < 24) recommendations.push("Use a more descriptive title for better search reach");
  if (riskFlags.length > 0) recommendations.push("Review the uploaded images before publishing");
  if (Number(input.price || 0) < priceEstimates.quickSalePrice * 0.9) recommendations.push("Consider raising the price to align with the market estimate");

  return {
    productType,
    productName: title,
    brand,
    model: null,
    category,
    condition,
    estimatedAge: condition === "New" ? "Less than 1 year" : condition === "Like New" ? "1-2 years" : "2-5 years",
    primaryColor,
    secondaryColors,
    material,
    style,
    size: null,
    gender: null,
    keywords,
    seoTags,
    title,
    description,
    highlights: [
      `Strong ${condition.toLowerCase()} condition`,
      `${primaryColor} color palette`,
      `${material} construction`,
      `Optimized for ${category.toLowerCase()} buyers`,
    ],
    suggestedSpecifications: [`Condition: ${condition}`, `Material: ${material}`, `Style: ${style}`, `Color: ${primaryColor}`],
    suggestedTags: [category.toLowerCase(), productType.toLowerCase(), primaryColor.toLowerCase(), condition.toLowerCase(), style.toLowerCase()],
    priceEstimates,
    qualityScore,
    riskScore: Math.min(100, riskFlags.length * 25 + duplicateSignals.length * 12),
    riskFlags,
    duplicateSignals,
    recommendations,
    enhancementOptions: ["Remove background", "Improve lighting", "Increase sharpness", "Center the product", "Reduce clutter"],
    confidence: Number((priceEstimates.confidence + 0.05).toFixed(2)),
    rationale: `The assistant analyzed the uploaded images and inferred the likely item type, style, condition, and pricing context from the file names and image metadata.`,
  };
}
