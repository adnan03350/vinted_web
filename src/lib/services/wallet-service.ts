import { createServiceRoleClient } from "@/lib/supabase/server";

export type WalletTransactionType =
  | "topup"
  | "sale"
  | "commission"
  | "refund"
  | "payout"
  | "credit"
  | "debit";

function commissionRate() {
  return Number(process.env.NEXT_PUBLIC_ESCROW_COMMISSION_RATE || 0.1);
}

/**
 * Platform commission is a pure calculation so callers can preview fees
 * before any money moves.
 */
export function applyPlatformCommission(saleAmount: number, rate = commissionRate()) {
  const amount = Number(saleAmount || 0);
  const commission = Number((amount * rate).toFixed(2));
  const net = Number((amount - commission).toFixed(2));
  return { commission, net, rate };
}

async function ensureWallet(supabase: any, userId: string, currency = "USD") {
  const { data: existing } = await supabase.from("wallets").select("*").eq("user_id", userId).maybeSingle();
  if (existing) return existing;
  const { data } = await supabase
    .from("wallets")
    .insert({ user_id: userId, balance: 0, currency })
    .select()
    .single();
  return data;
}

async function recordTransaction(
  supabase: any,
  userId: string,
  type: WalletTransactionType,
  amount: number,
  balanceAfter: number,
  options: { orderId?: string | null; reference?: string | null } = {}
) {
  await supabase.from("wallet_transactions").insert({
    user_id: userId,
    type,
    amount,
    balance_after: balanceAfter,
    order_id: options.orderId ?? null,
    reference: options.reference ?? null,
  });
}

export async function getWallet(userId: string, currency = "USD") {
  const supabase = createServiceRoleClient();
  if (!supabase || !userId) return null;
  return ensureWallet(supabase, userId, currency);
}

export async function creditWallet(
  userId: string,
  amount: number,
  options: { type?: WalletTransactionType; orderId?: string | null; reference?: string | null; currency?: string } = {}
) {
  const supabase = createServiceRoleClient();
  if (!supabase || !userId || amount <= 0) return null;

  const wallet = await ensureWallet(supabase, userId, options.currency || "USD");
  const balanceAfter = Number((Number(wallet.balance || 0) + amount).toFixed(2));
  await supabase.from("wallets").update({ balance: balanceAfter, updated_at: new Date().toISOString() }).eq("user_id", userId);
  await recordTransaction(supabase, userId, options.type ?? "credit", amount, balanceAfter, options);
  return balanceAfter;
}

export async function debitWallet(
  userId: string,
  amount: number,
  options: { type?: WalletTransactionType; orderId?: string | null; reference?: string | null } = {}
) {
  const supabase = createServiceRoleClient();
  if (!supabase || !userId || amount <= 0) return null;

  const wallet = await ensureWallet(supabase, userId);
  if (Number(wallet.balance || 0) < amount) return null;

  const balanceAfter = Number((Number(wallet.balance || 0) - amount).toFixed(2));
  await supabase.from("wallets").update({ balance: balanceAfter, updated_at: new Date().toISOString() }).eq("user_id", userId);
  await recordTransaction(supabase, userId, options.type ?? "debit", -amount, balanceAfter, options);
  return balanceAfter;
}

export async function refundToWallet(userId: string, amount: number, orderId?: string | null) {
  return creditWallet(userId, amount, { type: "refund", orderId, reference: "Order refund" });
}

export async function creditSaleToWallet(userId: string, amount: number, orderId?: string | null) {
  return creditWallet(userId, amount, { type: "sale", orderId, reference: "Sale released from escrow" });
}

export async function requestPayout(userId: string, amount: number, currency: string) {
  const supabase = createServiceRoleClient();
  if (!supabase || !userId || amount <= 0) return null;

  const debited = await debitWallet(userId, amount, { type: "payout", reference: "Payout request" });
  if (debited === null) return null;

  const { data } = await supabase
    .from("payout_requests")
    .insert({ user_id: userId, amount, currency, status: "PENDING" })
    .select()
    .single();
  return data ?? null;
}

export async function getWalletTransactions(userId: string, limit = 50) {
  const supabase = createServiceRoleClient();
  if (!supabase || !userId) return [];
  const { data } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function listPayoutRequests(limit = 50) {
  const supabase = createServiceRoleClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("payout_requests")
    .select("*")
    .order("requested_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function updatePayoutStatus(payoutId: string, status: "PENDING" | "APPROVED" | "REJECTED" | "PAID") {
  const supabase = createServiceRoleClient();
  if (!supabase) return null;
  const { data } = await supabase.from("payout_requests").update({ status }).eq("id", payoutId).select().single();
  return data ?? null;
}
