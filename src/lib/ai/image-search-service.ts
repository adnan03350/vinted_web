import { analyzeListing } from "@/lib/ai/listing-analysis";
import { findVisuallySimilar, type VisualFeatures, type VisualSearchResult } from "@/lib/ai/visual-similarity-engine";

/**
 * Extract visual features from an uploaded image by reusing the existing
 * listing-analysis inference pipeline, then map them to the shape the
 * visual-similarity engine consumes.
 */
export function analyzeImageFeatures(file: File): VisualFeatures {
  const analysis = analyzeListing([file], {});
  return {
    category: analysis.category,
    productType: analysis.productType,
    primaryColor: analysis.primaryColor,
    secondaryColors: analysis.secondaryColors,
    material: analysis.material,
    style: analysis.style,
    keywords: analysis.keywords,
    confidence: analysis.confidence,
  };
}

/**
 * Build a short human-readable query describing what was detected, so the UI
 * and stored history can show the intent of the image search.
 */
export function buildDetectedQuery(features: VisualFeatures) {
  return [features.primaryColor, features.material, features.productType, features.category]
    .filter((part) => part && part !== "Neutral" && part !== "Mixed materials")
    .join(" ")
    .trim();
}

/**
 * Analyze an image and return visually similar products from the catalog.
 */
export function searchByImage(file: File, products: any[]): VisualSearchResult & { detectedQuery: string } {
  const features = analyzeImageFeatures(file);
  const result = findVisuallySimilar(features, products);
  return { ...result, detectedQuery: buildDetectedQuery(features) };
}
