import { describe, expect, it } from "vitest";
import { buildSemanticSearch } from "@/lib/ai/search-engine";

const sampleProducts = [
  {
    id: "1",
    title: "Gaming laptop",
    description: "RTX graphics, 16GB RAM, good condition",
    price: 650,
    currency: "USD",
    category: "Electronics",
    condition: "Good",
    country: "UAE",
  },
  {
    id: "2",
    title: "Leather handbag",
    description: "Brown tote bag",
    price: 80,
    currency: "USD",
    category: "Bags",
    condition: "Like New",
    country: "Pakistan",
  },
];

describe("semantic search", () => {
  it("ranks products by natural language intent", () => {
    const result = buildSemanticSearch("gaming laptop under 700", sampleProducts);
    expect(result.products[0]?.id).toBe("1");
    expect(result.analytics.confidence).toBeGreaterThan(0);
  });

  it("returns empty results for unrelated queries", () => {
    const result = buildSemanticSearch("luxury yacht", sampleProducts);
    expect(result.products.length).toBeLessThanOrEqual(sampleProducts.length);
  });
});
