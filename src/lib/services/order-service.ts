import { createServiceRoleClient } from "@/lib/supabase/server";

const PURCHASED_STATUSES = [
  "PENDING_HELD",
  "SHIPPED",
  "DELIVERED",
  "BUYER_APPROVED",
  "RELEASED_TO_SELLER",
];

export async function userHasPurchasedProduct(userId: string | null | undefined, productId: string) {
  const service = createServiceRoleClient();
  if (!service || !userId) {
    return { purchased: false, orderId: null as string | null, alreadyReviewed: false };
  }

  const { data: order } = await service
    .from("orders")
    .select("id")
    .eq("buyer_id", userId)
    .eq("product_id", productId)
    .in("status", PURCHASED_STATUSES)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!order) {
    return { purchased: false, orderId: null, alreadyReviewed: false };
  }

  const { data: existingReview } = await service
    .from("reviews")
    .select("id")
    .eq("author_id", userId)
    .eq("target_type", "product")
    .eq("target_id", productId)
    .maybeSingle();

  return {
    purchased: true,
    orderId: order.id as string,
    alreadyReviewed: Boolean(existingReview),
  };
}
