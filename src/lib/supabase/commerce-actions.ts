"use server";

import { revalidatePath } from "next/cache";
import { getServerUser } from "@/lib/supabase/server";
import { followSeller, unfollowSeller, saveProduct, unsaveProduct, logProductShare } from "@/lib/services/social-service";
import { createReview, reportReview, type ReviewTargetType } from "@/lib/services/review-service";
import { addShippingAddress, requestReturn, type ShippingAddressInput } from "@/lib/services/shipping-service";
import { requestPayout } from "@/lib/services/wallet-service";
import { markNotificationRead, markAllNotificationsRead, getUnreadNotificationCount } from "@/lib/services/notification-service";

async function requireUser() {
  const user = await getServerUser();
  if (!user) throw new Error("Authentication required");
  return user;
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
