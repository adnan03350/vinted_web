import { createServiceRoleClient, getServerUser } from "@/lib/supabase/server";
import { createNotification } from "@/lib/services/notification-service";
import { creditSaleToWallet, refundToWallet } from "@/lib/services/wallet-service";
import { revalidatePath } from "next/cache";
import { v4 as uuid } from "uuid";

// Escrow moves money across buyer/seller balances, so it must run with the
// service-role client that bypasses RLS. Callers are responsible for verifying
// the acting user before invoking these functions.
async function getEscrowClient() {
  try {
    return createServiceRoleClient();
  } catch {
    return null;
  }
}

// Balance model (all held server-side):
//   pending_balance   -> funds held in escrow, not yet released
//   available_balance -> released funds, withdrawable via payout
//   seller_balance    -> total owed to the seller (pending + available)
// Transitions keep these consistent:
//   hold    : pending += s ; seller_balance += s
//   release : pending -= s ; available += s ; seller_balance unchanged
//   refund  : pending -= s ; seller_balance -= s
//   payout  : available -= amt ; seller_balance -= amt
async function ensureSellerBalance(supabase: any, userId: string, currency: string) {
  const { data: existing } = await supabase.from("seller_balances").select("*").eq("user_id", userId).maybeSingle();
  if (existing) return existing;

  const { data, error } = await supabase.from("seller_balances").insert({
    user_id: userId,
    seller_balance: 0,
    pending_balance: 0,
    available_balance: 0,
    currency,
  }).select().single();

  if (error) throw error;
  return data;
}

async function logAdminAction(supabase: any, actorId: string, actionType: string, targetType: string, targetId: string, details: Record<string, any>) {
  await supabase.from("admin_actions").insert({
    actor_id: actorId,
    action_type: actionType,
    target_type: targetType,
    target_id: targetId,
    details,
  });
}

async function logEscrowEvent(supabase: any, orderId: string, eventType: string, amount: number, currency: string, notes: string, balanceBefore = 0, balanceAfter = 0) {
  await supabase.from("escrow_transactions").insert({
    order_id: orderId,
    event_type: eventType,
    amount,
    currency,
    notes,
    balance_before: balanceBefore,
    balance_after: balanceAfter,
  });
}

export async function createEscrowOrder(productId: string, buyerId: string) {
  const supabase = await getEscrowClient();
  if (!supabase) return null;

  const { data: product } = await supabase.from("products").select("*").eq("id", productId).single();
  if (!product) return null;

  const commissionRate = Number(process.env.NEXT_PUBLIC_ESCROW_COMMISSION_RATE || 0.1);
  const amount = Number(product.price || 0);
  const platformFee = Number((amount * commissionRate).toFixed(2));
  const sellerAmount = Number((amount - platformFee).toFixed(2));

  const orderId = uuid();
  const paymentId = uuid();

  const { data: order, error: orderError } = await supabase.from("orders").insert({
    id: orderId,
    product_id: productId,
    buyer_id: buyerId,
    seller_id: product.seller_id,
    status: "PAYMENT_PENDING",
    amount,
    currency: product.currency,
  }).select().single();
  if (orderError) throw orderError;

  const { error: paymentError } = await supabase.from("payments").insert({
    id: paymentId,
    order_id: orderId,
    amount,
    currency: product.currency,
    status: "PENDING_HELD",
    platform_fee: platformFee,
    seller_amount: sellerAmount,
    provider_reference: `escrow-${paymentId}`,
    verified_at: new Date().toISOString(),
  });
  if (paymentError) throw paymentError;

  const balance = await ensureSellerBalance(supabase, product.seller_id, product.currency);
  await supabase.from("seller_balances").update({
    pending_balance: Number(balance.pending_balance || 0) + sellerAmount,
    seller_balance: Number(balance.seller_balance || 0) + sellerAmount,
  }).eq("user_id", product.seller_id);

  await supabase.from("orders").update({ status: "PENDING_HELD" }).eq("id", orderId);
  await logEscrowEvent(supabase, orderId, "payment_held", amount, product.currency, "Payment held in escrow", 0, sellerAmount);
  await logAdminAction(supabase, buyerId, "order_created", "order", orderId, { amount, currency: product.currency });

  await createNotification({ userId: product.seller_id, type: "order", title: "New order received", content: `An order for ${amount} ${product.currency} is held in escrow.`, link: "/orders" });
  await createNotification({ userId: buyerId, type: "payment", title: "Payment secured in escrow", content: `Your payment of ${amount} ${product.currency} is protected until delivery.`, link: "/orders" });

  revalidatePath("/orders");
  revalidatePath("/admin");
  return order;
}

export async function markOrderShipped(orderId: string, sellerId: string) {
  const supabase = await getEscrowClient();
  if (!supabase) return null;

  const actor = await getServerUser();
  if (!actor || actor.id !== sellerId) return null;

  const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).single();
  if (!order || order.seller_id !== sellerId) return null;

  await supabase.from("orders").update({ status: "SHIPPED", updated_at: new Date().toISOString() }).eq("id", orderId);
  await logEscrowEvent(supabase, orderId, "seller_shipped", Number(order.amount || 0), order.currency, "Seller marked the item as shipped", 0, 0);
  await createNotification({ userId: order.buyer_id, type: "shipping", title: "Your order is on the way", content: "The seller marked your order as shipped.", link: "/orders" });
  revalidatePath("/orders");
  return order;
}

export async function markOrderDelivered(orderId: string, buyerId: string) {
  const supabase = await getEscrowClient();
  if (!supabase) return null;

  const actor = await getServerUser();
  if (!actor || actor.id !== buyerId) return null;

  const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).single();
  if (!order || order.buyer_id !== buyerId) return null;

  const deliveredAt = new Date().toISOString();
  await supabase.from("orders").update({ status: "DELIVERED", delivered_at: deliveredAt, updated_at: deliveredAt }).eq("id", orderId);
  await logEscrowEvent(supabase, orderId, "delivered", Number(order.amount || 0), order.currency, "Buyer confirmed delivery", 0, 0);
  await createNotification({ userId: order.seller_id, type: "shipping", title: "Delivery confirmed", content: "The buyer confirmed delivery. Funds will release per the escrow window.", link: "/orders" });
  revalidatePath("/orders");
  return order;
}

export async function approveOrder(orderId: string, buyerId: string) {
  const supabase = await getEscrowClient();
  if (!supabase) return null;

  const actor = await getServerUser();
  if (!actor || actor.id !== buyerId) return null;

  const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).single();
  if (!order || order.buyer_id !== buyerId) return null;

  await supabase.from("orders").update({ status: "BUYER_APPROVED", updated_at: new Date().toISOString() }).eq("id", orderId);
  await releaseEscrowPayment(orderId, buyerId);
  revalidatePath("/orders");
  revalidatePath("/admin");
  return order;
}

export async function openEscrowDispute(orderId: string, buyerId: string, reason: string) {
  const supabase = await getEscrowClient();
  if (!supabase) return null;

  const actor = await getServerUser();
  if (!actor || actor.id !== buyerId) return null;

  const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).single();
  if (!order || order.buyer_id !== buyerId) return null;

  const disputeId = uuid();
  await supabase.from("disputes").insert({
    id: disputeId,
    order_id: orderId,
    opened_by: buyerId,
    status: "OPEN",
    reason,
  });
  await supabase.from("orders").update({ status: "DISPUTED" }).eq("id", orderId);
  await logEscrowEvent(supabase, orderId, "dispute_opened", Number(order.amount || 0), order.currency, reason, 0, 0);
  await logAdminAction(supabase, buyerId, "dispute_opened", "dispute", disputeId, { reason });
  await createNotification({ userId: order.seller_id, type: "dispute", title: "A dispute was opened", content: reason || "The buyer opened a dispute on an order.", link: "/orders" });
  revalidatePath("/orders");
  revalidatePath("/admin");
  return disputeId;
}

export async function respondToEscrowDispute(disputeId: string, userId: string, message: string) {
  const supabase = await getEscrowClient();
  if (!supabase) return null;

  const { data: dispute } = await supabase.from("disputes").select("*").eq("id", disputeId).single();
  if (!dispute) return null;

  await supabase.from("dispute_messages").insert({
    dispute_id: disputeId,
    sender_id: userId,
    content: message,
  });
  revalidatePath("/orders");
  revalidatePath("/admin");
  return dispute;
}

export async function resolveEscrowDispute(disputeId: string, actorId: string, decision: "refund" | "release", reason: string) {
  const supabase = await getEscrowClient();
  if (!supabase) return null;

  const { data: dispute } = await supabase.from("disputes").select("*").eq("id", disputeId).single();
  if (!dispute) return null;

  const { data: order } = await supabase.from("orders").select("*").eq("id", dispute.order_id).single();
  if (!order) return null;

  await supabase.from("disputes").update({ status: "RESOLVED", resolved_at: new Date().toISOString(), resolution: decision, resolution_reason: reason }).eq("id", disputeId);
  if (decision === "refund") {
    // Reverse the held funds off the seller's balance so a refund does not
    // leave the seller with escrow credit for money returned to the buyer.
    const { data: payment } = await supabase.from("payments").select("seller_amount").eq("order_id", order.id).maybeSingle();
    const sellerAmount = Number(payment?.seller_amount || 0);
    const { data: balance } = await supabase.from("seller_balances").select("*").eq("user_id", order.seller_id).maybeSingle();
    if (balance) {
      await supabase.from("seller_balances").update({
        pending_balance: Math.max(0, Number(balance.pending_balance || 0) - sellerAmount),
        seller_balance: Math.max(0, Number(balance.seller_balance || 0) - sellerAmount),
      }).eq("user_id", order.seller_id);
    }
    await supabase.from("orders").update({ status: "REFUNDED", updated_at: new Date().toISOString() }).eq("id", order.id);
    await supabase.from("payments").update({ status: "REFUNDED" }).eq("order_id", order.id);
    await logEscrowEvent(supabase, order.id, "refund", Number(order.amount || 0), order.currency, reason, 0, 0);
    await refundToWallet(order.buyer_id, Number(order.amount || 0), order.id).catch(() => null);
    await createNotification({ userId: order.buyer_id, type: "payment", title: "Refund issued", content: `Your refund of ${order.amount} ${order.currency} was credited to your wallet.`, link: "/orders" });
  } else {
    // Move funds pending -> available and flip order/payment status consistently.
    await releaseEscrowPayment(order.id, actorId);
  }
  await logAdminAction(supabase, actorId, "dispute_resolved", "dispute", disputeId, { decision, reason });
  revalidatePath("/orders");
  revalidatePath("/admin");
  return dispute;
}

export async function requestSellerPayout(userId: string, amount: number, currency: string) {
  const supabase = await getEscrowClient();
  if (!supabase) return null;

  const { data: balance } = await supabase.from("seller_balances").select("*").eq("user_id", userId).maybeSingle();
  if (!balance || Number(balance.available_balance || 0) < amount) return null;

  const payoutId = uuid();
  await supabase.from("payout_requests").insert({
    id: payoutId,
    user_id: userId,
    amount,
    currency,
    status: "PENDING",
  });
  await supabase.from("seller_balances").update({
    available_balance: Number(balance.available_balance || 0) - amount,
    seller_balance: Math.max(0, Number(balance.seller_balance || 0) - amount),
  }).eq("user_id", userId);
  revalidatePath("/orders");
  revalidatePath("/admin");
  return payoutId;
}

export async function releaseEscrowPayment(orderId: string, actorId: string) {
  const supabase = await getEscrowClient();
  if (!supabase) return null;

  const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).single();
  if (!order) return null;

  const { data: payment } = await supabase.from("payments").select("*").eq("order_id", orderId).maybeSingle();
  if (!payment || payment.status === "RELEASED_TO_SELLER") return null;

  const sellerAmount = Number(payment.seller_amount || 0);
  const { data: balance } = await supabase.from("seller_balances").select("*").eq("user_id", order.seller_id).maybeSingle();
  if (!balance) return null;

  await supabase.from("seller_balances").update({
    pending_balance: Math.max(0, Number(balance.pending_balance || 0) - sellerAmount),
    available_balance: Number(balance.available_balance || 0) + sellerAmount,
  }).eq("user_id", order.seller_id);

  await supabase.from("payments").update({ status: "RELEASED_TO_SELLER" }).eq("order_id", orderId);
  await supabase.from("orders").update({ status: "RELEASED_TO_SELLER", updated_at: new Date().toISOString() }).eq("id", orderId);
  await logEscrowEvent(supabase, orderId, "release", sellerAmount, order.currency, "Funds released to seller", Number(balance.pending_balance || 0), Number(balance.available_balance || 0) + sellerAmount);
  await logAdminAction(supabase, actorId, "payment_released", "order", orderId, { amount: sellerAmount, currency: order.currency });
  await creditSaleToWallet(order.seller_id, sellerAmount, orderId).catch(() => null);
  await createNotification({ userId: order.seller_id, type: "payment", title: "Funds released to your wallet", content: `${sellerAmount} ${order.currency} from a completed sale is now in your wallet.`, link: "/orders" });
  revalidatePath("/orders");
  revalidatePath("/admin");
  return payment;
}

export async function autoReleaseEscrowOrders() {
  const supabase = await getEscrowClient();
  if (!supabase) return [];

  const releaseDays = Number(process.env.NEXT_PUBLIC_ESCROW_RELEASE_DAYS || 3);
  const { data: orders } = await supabase.from("orders").select("*").eq("status", "DELIVERED");
  const pending = [] as string[];
  const windowMs = releaseDays * 24 * 60 * 60 * 1000;

  for (const order of orders || []) {
    // Count from delivery confirmation, not order creation. Skip orders that
    // are marked DELIVERED but have no delivered_at yet (nothing to time from).
    if (!order.delivered_at) continue;
    const deliveredAt = new Date(order.delivered_at).getTime();
    if (Number.isNaN(deliveredAt)) continue;
    if (Date.now() - deliveredAt > windowMs) {
      await releaseEscrowPayment(order.id, order.seller_id);
      pending.push(order.id);
    }
  }

  return pending;
}

export async function getSellerBalance(userId: string) {
  const supabase = await getEscrowClient();
  if (!supabase) return null;

  const { data } = await supabase.from("seller_balances").select("*").eq("user_id", userId).maybeSingle();
  return data;
}

export async function getEscrowOverview() {
  const supabase = await getEscrowClient();
  if (!supabase) {
    return {
      escrowOrders: 0,
      disputes: 0,
      refunds: 0,
      releases: 0,
      payoutRequests: 0,
    };
  }

  const [{ count: escrowOrders }, { count: disputes }, { count: refunds }, { count: releases }, { count: payoutRequests }] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["PENDING_HELD", "SELLER_TO_SHIP", "SHIPPED", "DELIVERED", "BUYER_APPROVED"]),
    supabase.from("disputes").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "REFUNDED"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "RELEASED_TO_SELLER"),
    supabase.from("payout_requests").select("id", { count: "exact", head: true }),
  ]);

  return {
    escrowOrders: escrowOrders ?? 0,
    disputes: disputes ?? 0,
    refunds: refunds ?? 0,
    releases: releases ?? 0,
    payoutRequests: payoutRequests ?? 0,
  };
}

export async function getUserOrders(userId: string) {
  const supabase = await getEscrowClient();
  if (!supabase) return [];
  const { data } = await supabase.from("orders").select("*, products(*)").or(`buyer_id.eq.${userId},seller_id.eq.${userId}`).order("created_at", { ascending: false });
  return data ?? [];
}
