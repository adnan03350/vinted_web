import { createServiceRoleClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/services/notification-service";

async function addActivity(
  supabase: any,
  input: { userId: string; activityType: string; targetType?: string; targetId?: string | null; metadata?: Record<string, any> }
) {
  await supabase.from("activity_feed").insert({
    user_id: input.userId,
    activity_type: input.activityType,
    target_type: input.targetType ?? null,
    target_id: input.targetId ?? null,
    metadata: input.metadata ?? {},
  });
}

export async function followSeller(followerId: string, sellerId: string) {
  const supabase = createServiceRoleClient();
  if (!supabase || !followerId || followerId === sellerId) return null;

  const { data } = await supabase
    .from("seller_followers")
    .upsert({ seller_id: sellerId, follower_id: followerId }, { onConflict: "seller_id,follower_id" })
    .select()
    .single();

  await addActivity(supabase, { userId: followerId, activityType: "follow", targetType: "seller", targetId: sellerId });
  await createNotification({
    userId: sellerId,
    type: "follow",
    title: "New follower",
    content: "A buyer started following your shop.",
    link: "/profile",
  });
  return data ?? null;
}

export async function unfollowSeller(followerId: string, sellerId: string) {
  const supabase = createServiceRoleClient();
  if (!supabase || !followerId) return null;
  await supabase.from("seller_followers").delete().eq("seller_id", sellerId).eq("follower_id", followerId);
  return true;
}

export async function isFollowing(followerId: string | null | undefined, sellerId: string) {
  const supabase = createServiceRoleClient();
  if (!supabase || !followerId) return false;
  const { data } = await supabase
    .from("seller_followers")
    .select("id")
    .eq("seller_id", sellerId)
    .eq("follower_id", followerId)
    .maybeSingle();
  return Boolean(data);
}

export async function getFollowersCount(sellerId: string) {
  const supabase = createServiceRoleClient();
  if (!supabase) return 0;
  const { count } = await supabase
    .from("seller_followers")
    .select("id", { count: "exact", head: true })
    .eq("seller_id", sellerId);
  return count ?? 0;
}

export async function saveProduct(userId: string, productId: string) {
  const supabase = createServiceRoleClient();
  if (!supabase || !userId) return null;
  const { data } = await supabase
    .from("saved_products")
    .upsert({ user_id: userId, product_id: productId }, { onConflict: "user_id,product_id" })
    .select()
    .single();
  await addActivity(supabase, { userId, activityType: "save", targetType: "product", targetId: productId });
  return data ?? null;
}

export async function unsaveProduct(userId: string, productId: string) {
  const supabase = createServiceRoleClient();
  if (!supabase || !userId) return null;
  await supabase.from("saved_products").delete().eq("user_id", userId).eq("product_id", productId);
  return true;
}

export async function isProductSaved(userId: string | null | undefined, productId: string) {
  const supabase = createServiceRoleClient();
  if (!supabase || !userId) return false;
  const { data } = await supabase
    .from("saved_products")
    .select("id")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .maybeSingle();
  return Boolean(data);
}

export async function getSavedProducts(userId: string) {
  const supabase = createServiceRoleClient();
  if (!supabase || !userId) return [];
  const { data } = await supabase
    .from("saved_products")
    .select("*, products(*, product_images(*))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export function buildShareUrl(productId: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL || "";
  return `${base}/products/${productId}`;
}

export async function logProductShare(userId: string | null | undefined, productId: string) {
  const supabase = createServiceRoleClient();
  const url = buildShareUrl(productId);
  if (supabase && userId) {
    await addActivity(supabase, { userId, activityType: "share", targetType: "product", targetId: productId, metadata: { url } });
  }
  return url;
}

export async function getActivityFeed(limit = 30) {
  const supabase = createServiceRoleClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("activity_feed")
    .select("*, profiles!user_id(full_name, avatar_url)")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
