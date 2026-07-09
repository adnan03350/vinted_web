"use server";

import { revalidatePath } from "next/cache";
import { getServerUser, createServiceRoleClient } from "@/lib/supabase/server";
import { followSeller, unfollowSeller, saveProduct, unsaveProduct, logProductShare } from "@/lib/services/social-service";
import { createReview, reportReview, type ReviewTargetType } from "@/lib/services/review-service";
import { addShippingAddress, requestReturn, type ShippingAddressInput } from "@/lib/services/shipping-service";
import { requestPayout } from "@/lib/services/wallet-service";
import { markNotificationRead, markAllNotificationsRead, getUnreadNotificationCount } from "@/lib/services/notification-service";
import {
  approveOrder,
  markOrderDelivered,
  markOrderShipped,
  openEscrowDispute,
} from "@/lib/ai/escrow";
import { sanitizeText } from "@/lib/security/sanitize";
import { countries } from "@/lib/constants/marketplace";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function requireUser() {
  const user = await getServerUser();
  if (!user) throw new Error("Authentication required");
  return user;
}

function fail(error: unknown, fallback: string): ActionResult {
  if (error instanceof Error) return { ok: false, error: error.message };
  return { ok: false, error: fallback };
}

export async function followSellerAction(sellerId: string) {
  const user = await requireUser();
  await followSeller(user.id, sellerId);
  revalidatePath(`/products`);
  revalidatePath(`/profile`);
}

export async function unfollowSellerAction(sellerId: string) {
  const user = await requireUser();
  await unfollowSeller(user.id, sellerId);
  revalidatePath(`/products`);
  revalidatePath(`/profile`);
}

export async function saveProductAction(productId: string) {
  const user = await requireUser();
  await saveProduct(user.id, productId);
  revalidatePath(`/products/${productId}`);
}

export async function unsaveProductAction(productId: string) {
  const user = await requireUser();
  await unsaveProduct(user.id, productId);
  revalidatePath(`/products/${productId}`);
}

export async function shareProductAction(productId: string) {
  const user = await getServerUser();
  return logProductShare(user?.id ?? null, productId);
}

export async function submitReviewAction(input: {
  targetType: ReviewTargetType;
  targetId: string;
  orderId?: string | null;
  rating: number;
  comment?: string;
}) {
  const user = await requireUser();
  const review = await createReview({ authorId: user.id, ...input });
  if (input.targetType === "product") revalidatePath(`/products/${input.targetId}`);
  return review;
}

export async function reportReviewAction(reviewId: string, reason: string, productId?: string) {
  await requireUser();
  await reportReview(reviewId, reason);
  if (productId) revalidatePath(`/products/${productId}`);
}

export async function addShippingAddressAction(input: ShippingAddressInput) {
  const user = await requireUser();
  const address = await addShippingAddress(user.id, input);
  revalidatePath("/orders");
  return address;
}

export async function requestReturnAction(orderId: string, reason: string) {
  const user = await requireUser();
  const result = await requestReturn(orderId, user.id, reason);
  revalidatePath("/orders");
  return result;
}

export async function requestPayoutAction(amount: number, currency: string) {
  const user = await requireUser();
  const payout = await requestPayout(user.id, amount, currency);
  revalidatePath("/orders");
  return payout;
}

export async function getUnreadCountAction() {
  const user = await getServerUser();
  if (!user) return 0;
  return getUnreadNotificationCount(user.id);
}

export async function markNotificationReadAction(id: string) {
  const user = await requireUser();
  await markNotificationRead(id, user.id);
  revalidatePath("/notifications");
}

export async function markAllNotificationsReadAction() {
  const user = await requireUser();
  await markAllNotificationsRead(user.id);
  revalidatePath("/notifications");
}

export async function markOrderShippedAction(orderId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const result = await markOrderShipped(orderId, user.id);
    if (!result) return { ok: false, error: "Unable to mark order as shipped." };
    revalidatePath("/orders");
    revalidatePath(`/orders/${orderId}`);
    return { ok: true };
  } catch (error) {
    return fail(error, "Unable to mark order as shipped.");
  }
}

export async function markOrderDeliveredAction(orderId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const result = await markOrderDelivered(orderId, user.id);
    if (!result) return { ok: false, error: "Unable to confirm delivery." };
    revalidatePath("/orders");
    revalidatePath(`/orders/${orderId}`);
    return { ok: true };
  } catch (error) {
    return fail(error, "Unable to confirm delivery.");
  }
}

export async function approveOrderAction(orderId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const result = await approveOrder(orderId, user.id);
    if (!result) return { ok: false, error: "Unable to approve order." };
    revalidatePath("/orders");
    revalidatePath(`/orders/${orderId}`);
    return { ok: true };
  } catch (error) {
    return fail(error, "Unable to approve order.");
  }
}

export async function openDisputeAction(orderId: string, reason: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const result = await openEscrowDispute(orderId, user.id, reason);
    if (!result) return { ok: false, error: "Unable to open dispute." };
    revalidatePath("/orders");
    revalidatePath(`/orders/${orderId}`);
    return { ok: true };
  } catch (error) {
    return fail(error, "Unable to open dispute.");
  }
}

export async function updateProfileAction(input: {
  full_name: string;
  country: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const fullName = sanitizeText(input.full_name.trim(), 120);
    if (fullName.length < 2) return { ok: false, error: "Name must be at least 2 characters." };
    if (!countries.includes(input.country as (typeof countries)[number])) {
      return { ok: false, error: "Invalid country." };
    }

    const service = createServiceRoleClient();
    if (!service) return { ok: false, error: "Server configuration error." };

    const { error } = await service
      .from("profiles")
      .update({ full_name: fullName, country: input.country })
      .eq("id", user.id);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/profile");
    revalidatePath("/settings");
    revalidatePath(`/users/${user.id}`);
    return { ok: true };
  } catch (error) {
    return fail(error, "Unable to update profile.");
  }
}

export async function markListingSoldAction(productId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const service = createServiceRoleClient();
    if (!service) return { ok: false, error: "Server configuration error." };

    const { data: product } = await service.from("products").select("seller_id").eq("id", productId).maybeSingle();
    if (!product || product.seller_id !== user.id) {
      return { ok: false, error: "You can only update your own listings." };
    }

    const { error } = await service.from("products").update({ status: "sold" }).eq("id", productId);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/profile");
    revalidatePath("/browse");
    revalidatePath(`/products/${productId}`);
    return { ok: true };
  } catch (error) {
    return fail(error, "Unable to mark listing as sold.");
  }
}

export async function deleteListingAction(productId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const service = createServiceRoleClient();
    if (!service) return { ok: false, error: "Server configuration error." };

    const { data: product } = await service.from("products").select("seller_id").eq("id", productId).maybeSingle();
    if (!product || product.seller_id !== user.id) {
      return { ok: false, error: "You can only delete your own listings." };
    }

    const { error } = await service.from("products").delete().eq("id", productId);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/profile");
    revalidatePath("/browse");
    return { ok: true };
  } catch (error) {
    return fail(error, "Unable to delete listing.");
  }
}
