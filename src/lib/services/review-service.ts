import { createServiceRoleClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/services/notification-service";

export type ReviewTargetType = "seller" | "buyer" | "product";

export type CreateReviewInput = {
  authorId: string;
  targetType: ReviewTargetType;
  targetId: string;
  orderId?: string | null;
  rating: number;
  comment?: string;
};

export async function createReview(input: CreateReviewInput) {
  const supabase = createServiceRoleClient();
  if (!supabase || !input.authorId) return null;

  const rating = Math.max(1, Math.min(5, Math.round(Number(input.rating) || 0)));
  const { data } = await supabase
    .from("reviews")
    .insert({
      author_id: input.authorId,
      target_type: input.targetType,
      target_id: input.targetId,
      order_id: input.orderId ?? null,
      rating,
      comment: input.comment ?? null,
      status: "visible",
      reported: false,
    })
    .select()
    .single();

  // Notify the reviewed seller/buyer (not for product reviews).
  if (data && (input.targetType === "seller" || input.targetType === "buyer")) {
    await createNotification({
      userId: input.targetId,
      type: "review",
      title: "You received a new review",
      content: `${rating}★ ${input.comment ? "— " + input.comment.slice(0, 80) : ""}`.trim(),
      link: "/profile",
    });
  }
  return data ?? null;
}

export async function getReviews(targetType: ReviewTargetType, targetId: string, limit = 50) {
  const supabase = createServiceRoleClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("reviews")
    .select("*, profiles!author_id(full_name, avatar_url)")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .eq("status", "visible")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getRatingSummary(targetType: ReviewTargetType, targetId: string) {
  const supabase = createServiceRoleClient();
  const empty = { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number> };
  if (!supabase) return empty;

  const { data } = await supabase
    .from("reviews")
    .select("rating")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .eq("status", "visible");

  const rows = data ?? [];
  if (!rows.length) return empty;

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>;
  let total = 0;
  for (const row of rows) {
    const rating = Number(row.rating) || 0;
    total += rating;
    if (distribution[rating] !== undefined) distribution[rating] += 1;
  }
  return {
    average: Number((total / rows.length).toFixed(2)),
    count: rows.length,
    distribution,
  };
}

export async function reportReview(reviewId: string, reason: string) {
  const supabase = createServiceRoleClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("reviews")
    .update({ reported: true, report_reason: reason })
    .eq("id", reviewId)
    .select()
    .single();
  return data ?? null;
}

export async function listReportedReviews(limit = 50) {
  const supabase = createServiceRoleClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("reviews")
    .select("*, profiles!author_id(full_name)")
    .eq("reported", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function listRecentReviews(limit = 20) {
  const supabase = createServiceRoleClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("reviews")
    .select("*, profiles!author_id(full_name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function moderateReview(reviewId: string, action: "hide" | "show") {
  const supabase = createServiceRoleClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("reviews")
    .update({ status: action === "hide" ? "hidden" : "visible", reported: action === "hide" ? false : undefined })
    .eq("id", reviewId)
    .select()
    .single();
  return data ?? null;
}
