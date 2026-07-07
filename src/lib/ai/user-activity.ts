import { createServiceRoleClient } from "@/lib/supabase/server";

async function trackActivity(payload: Record<string, any>) {
  // user_activity is a service-role-only analytics table under RLS.
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return null;
  }

  const { error } = await supabase.from("user_activity").insert(payload);
  if (error) {
    throw error;
  }
  return payload;
}

export async function trackProductView(productId: string, userId?: string | null) {
  return trackActivity({ product_id: productId, user_id: userId ?? null, activity_type: "view", created_at: new Date().toISOString() });
}

export async function trackSearch(query: string, userId?: string | null) {
  return trackActivity({ query, user_id: userId ?? null, activity_type: "search", created_at: new Date().toISOString() });
}

export async function trackFavorite(productId: string, userId?: string | null) {
  return trackActivity({ product_id: productId, user_id: userId ?? null, activity_type: "favorite", created_at: new Date().toISOString() });
}

export async function trackClick(productId: string, userId?: string | null) {
  return trackActivity({ product_id: productId, user_id: userId ?? null, activity_type: "click", created_at: new Date().toISOString() });
}

export async function trackRecommendationImpression(section: string, productId: string, userId?: string | null) {
  return trackActivity({ section, product_id: productId, user_id: userId ?? null, activity_type: "recommendation_impression", created_at: new Date().toISOString() });
}
