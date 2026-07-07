import { createServiceRoleClient } from "@/lib/supabase/server";

export type AdminPlatformStats = {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  activeListings: number;
  escrowOrders: number;
  openDisputes: number;
  blockedAttempts: number;
  suspiciousListings: number;
  imageSearches: number;
  voiceSearches: number;
  averageTrustScore: number;
  averageRiskScore: number;
  unreadNotifications: number;
};

export async function getAdminPlatformStats(): Promise<AdminPlatformStats> {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return {
      totalUsers: 0,
      totalProducts: 0,
      totalOrders: 0,
      totalRevenue: 0,
      activeListings: 0,
      escrowOrders: 0,
      openDisputes: 0,
      blockedAttempts: 0,
      suspiciousListings: 0,
      imageSearches: 0,
      voiceSearches: 0,
      averageTrustScore: 0,
      averageRiskScore: 0,
      unreadNotifications: 0,
    };
  }

  const [
    users,
    products,
    activeListings,
    orders,
    revenueOrders,
    escrowOrders,
    disputes,
    blockedAttempts,
    suspiciousListings,
    imageSearches,
    voiceSearches,
    trustScores,
    unreadNotifications,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "available"),
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("amount").in("status", ["completed", "released", "delivered", "approved"]),
    supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["escrow_held", "paid", "shipped"]),
    supabase.from("disputes").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("blocked_chat_attempts").select("id", { count: "exact", head: true }),
    supabase.from("suspicious_listing_flags").select("id", { count: "exact", head: true }),
    supabase.from("image_search_history").select("id", { count: "exact", head: true }),
    supabase.from("voice_search_history").select("id", { count: "exact", head: true }),
    supabase.from("user_trust_scores").select("trust_score, risk_score"),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("is_read", false),
  ]);

  const totalRevenue = (revenueOrders.data ?? []).reduce((sum, order) => sum + Number(order.amount || 0), 0);
  const trustValues = trustScores.data ?? [];
  const averageTrustScore =
    trustValues.length > 0
      ? Math.round(
          trustValues.reduce((sum, row) => sum + Number(row.trust_score || 0), 0) / trustValues.length
        )
      : 0;
  const averageRiskScore =
    trustValues.length > 0
      ? Math.round(
          trustValues.reduce((sum, row) => sum + Number(row.risk_score || 0), 0) / trustValues.length
        )
      : 0;

  return {
    totalUsers: users.count ?? 0,
    totalProducts: products.count ?? 0,
    totalOrders: orders.count ?? 0,
    totalRevenue,
    activeListings: activeListings.count ?? 0,
    escrowOrders: escrowOrders.count ?? 0,
    openDisputes: disputes.count ?? 0,
    blockedAttempts: blockedAttempts.count ?? 0,
    suspiciousListings: suspiciousListings.count ?? 0,
    imageSearches: imageSearches.count ?? 0,
    voiceSearches: voiceSearches.count ?? 0,
    averageTrustScore,
    averageRiskScore,
    unreadNotifications: unreadNotifications.count ?? 0,
  };
}
