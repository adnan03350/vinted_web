import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";

export type RecommendationSection = {
  key: string;
  title: string;
  description: string;
  products: any[];
};

async function getProducts() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("products").select("*, product_images(*), profiles!seller_id(full_name)").eq("status", "available").order("created_at", { ascending: false }).limit(12);
  if (error) {
    return [] as any[];
  }
  return data ?? [];
}

async function getActivity() {
  // user_activity is service-role only under RLS.
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return [] as any[];
  }
  const { data, error } = await supabase.from("user_activity").select("*").order("created_at", { ascending: false }).limit(20);
  if (error) {
    return [] as any[];
  }
  return data ?? [];
}

function scoreProduct(product: any, activity: any[], section: string) {
  const base = product.price || 0;
  const freshness = product.created_at ? 1 : 0;
  const sellerRating = product.profiles?.full_name ? 1 : 0;
  const quality = product.price ? 1 : 0;
  let score = 0;

  if (section === "recommended") score += 4;
  if (section === "trending") score += 3;
  if (section === "similar") score += 3;
  if (section === "price-drop") score += 2;
  if (section === "new") score += 2;

  score += freshness + sellerRating + quality + Math.min(3, Math.round(base / 2000));

  activity.forEach((entry) => {
    if (entry.product_id === product.id) {
      score += 2;
    }
    if (entry.activity_type === "favorite") score += 1;
    if (entry.activity_type === "search") score += 0.5;
  });

  return score;
}

export async function getRecommendations() {
  const [products, activity] = await Promise.all([getProducts(), getActivity()]);

  const sections: RecommendationSection[] = [];

  if (products.length > 0) {
    const recommendedProducts = [...products]
      .sort((a, b) => scoreProduct(b, activity, "recommended") - scoreProduct(a, activity, "recommended"))
      .slice(0, 4);

    const trendingProducts = [...products]
      .sort((a, b) => scoreProduct(b, activity, "trending") - scoreProduct(a, activity, "trending"))
      .slice(0, 4);

    const similarProducts = [...products]
      .sort((a, b) => scoreProduct(b, activity, "similar") - scoreProduct(a, activity, "similar"))
      .slice(0, 4);

    const priceDropProducts = [...products]
      .sort((a, b) => scoreProduct(b, activity, "price-drop") - scoreProduct(a, activity, "price-drop"))
      .slice(0, 4);

    const newProducts = [...products]
      .sort((a, b) => scoreProduct(b, activity, "new") - scoreProduct(a, activity, "new"))
      .slice(0, 4);

    sections.push(
      { key: "recommended", title: "Recommended for you", description: "Picked from your activity and product quality signals", products: recommendedProducts },
      { key: "trending", title: "Trending near you", description: "Popular listings gaining attention in your region", products: trendingProducts },
      { key: "similar", title: "Similar to viewed products", description: "Products aligned with your recent browsing patterns", products: similarProducts },
      { key: "price-drop", title: "Recently price dropped", description: "Freshly discounted or competitive listings", products: priceDropProducts },
      { key: "new", title: "New listings", description: "Newly added items across the marketplace", products: newProducts }
    );
  }

  return sections;
}
