import { createServiceRoleClient } from "@/lib/supabase/server";

type ChatProtectionResult = {
  isBlocked: boolean;
  reasons: string[];
  riskPoints: number;
  warning: string;
};

type ListingAssessment = {
  isSuspicious: boolean;
  reasons: string[];
  riskPoints: number;
};

const PHONE_PATTERN = /\b(?:\+?\d[\d\s().-]{7,}\d)\b/;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const URL_PATTERN = /(?:https?:\/\/|www\.)\S+/i;
const WHATSAPP_PATTERN = /\b(?:whatsapp|wa\.me|chat\.whatsapp)\b/i;
const TELEGRAM_PATTERN = /\b(?:telegram|t\.me)\b/i;
const INSTAGRAM_PATTERN = /\B@([A-Za-z0-9_]{1,30})\b/;
const PAYMENT_PATTERN = /\b(?:paypal|venmo|cashapp|crypto|bitcoin|ethereum|bank transfer|wire transfer|direct transfer|send money|pay me directly|outside the app|outside platform|cash only)\b/i;

async function getSupabaseClient() {
  // Trust/moderation tables are service-role only under RLS.
  try {
    return createServiceRoleClient();
  } catch {
    return null;
  }
}

function normalizeContent(content: string) {
  return content.toLowerCase();
}

export function assessChatContent(content: string): ChatProtectionResult {
  const normalized = normalizeContent(content);
  const reasons: string[] = [];

  if (PHONE_PATTERN.test(content)) reasons.push("phone number");
  if (WHATSAPP_PATTERN.test(normalized)) reasons.push("WhatsApp reference");
  if (EMAIL_PATTERN.test(content)) reasons.push("email address");
  if (URL_PATTERN.test(content)) reasons.push("URL");
  if (TELEGRAM_PATTERN.test(normalized)) reasons.push("Telegram reference");
  if (INSTAGRAM_PATTERN.test(content)) reasons.push("Instagram handle");
  if (PAYMENT_PATTERN.test(normalized)) reasons.push("external payment attempt");

  const isBlocked = reasons.length > 0;
  const riskPoints = isBlocked ? Math.min(30, reasons.length * 8) : 0;

  return {
    isBlocked,
    reasons,
    riskPoints,
    warning: "For your safety, keep all payments and communication inside the platform.",
  };
}

export async function auditChatMessage(content: string, userId?: string | null) {
  const result = assessChatContent(content);
  const supabase = await getSupabaseClient();

  if (!supabase || !userId || !result.isBlocked) {
    return result;
  }

  try {
    await supabase.from("blocked_chat_attempts").insert({
      user_id: userId,
      content,
      matched_terms: result.reasons,
    });
    await supabase.from("moderation_events").insert({
      user_id: userId,
      event_type: "blocked_message",
      reason: "Blocked message attempted",
      severity: 2,
      details: { matched_terms: result.reasons },
    });
    await supabase.from("user_risk_events").insert({
      user_id: userId,
      event_type: "blocked_message",
      score: result.riskPoints,
      details: { matched_terms: result.reasons },
    });
  } catch {
    // ignore moderation persistence failures so the app remains available
  }

  await ensureUserTrustProfile(userId);
  return result;
}

export function assessListingRisk(title: string, description: string, price: number): ListingAssessment {
  const reasons: string[] = [];
  let riskPoints = 0;

  if (price > 0 && price < 25) {
    reasons.push("too-low pricing");
    riskPoints += 12;
  }

  if (/urgent|cheap|wholesale|clearance|cash only|limited time|must sell/i.test(`${title} ${description}`)) {
    reasons.push("suspicious listing language");
    riskPoints += 10;
  }

  if (/transfer|pay me|outside the app|direct payment|crypto|bank transfer/i.test(`${title} ${description}`)) {
    reasons.push("external payment request");
    riskPoints += 10;
  }

  return {
    isSuspicious: riskPoints >= 12,
    reasons,
    riskPoints,
  };
}

export async function flagSuspiciousListing({
  userId,
  productId,
  title,
  description,
  price,
}: {
  userId: string;
  productId: string;
  title: string;
  description: string;
  price: number;
}) {
  const assessment = assessListingRisk(title, description, price);
  const supabase = await getSupabaseClient();

  if (!supabase || !assessment.isSuspicious) return assessment;

  try {
    await supabase.from("suspicious_listing_flags").insert({
      user_id: userId,
      product_id: productId,
      reason: assessment.reasons.join(", "),
      risk_score: assessment.riskPoints,
    });
    await supabase.from("moderation_events").insert({
      user_id: userId,
      event_type: "suspicious_listing",
      reason: "Suspicious listing flagged",
      severity: 2,
      details: { reasons: assessment.reasons, risk_points: assessment.riskPoints },
    });
    await supabase.from("user_risk_events").insert({
      user_id: userId,
      event_type: "suspicious_listing",
      score: assessment.riskPoints,
      details: { reasons: assessment.reasons, risk_points: assessment.riskPoints },
    });
  } catch {
    // ignore moderation persistence failures so the app remains available
  }

  await ensureUserTrustProfile(userId);
  return assessment;
}

export async function ensureUserTrustProfile(userId: string | null, verifiedEmail = false) {
  const supabase = await getSupabaseClient();
  if (!supabase || !userId) return null;

  const { data: existing } = await supabase.from("user_trust_scores").select("*").eq("user_id", userId).maybeSingle();
  const { data: profileRows } = await supabase.from("profiles").select("created_at").eq("id", userId).maybeSingle();
  const { data: riskEvents } = await supabase.from("user_risk_events").select("score").eq("user_id", userId);
  const { data: orders } = await supabase.from("orders").select("status").or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
  const { data: disputes } = await supabase.from("moderation_events").select("id").eq("user_id", userId).or("event_type.eq.dispute,event_type.eq.repeated_dispute");
  // Only this user's own listings should feed their listing-quality signal.
  const { data: listingRows } = await supabase
    .from("listing_ai_analysis")
    .select("quality_score, products!inner(seller_id)")
    .eq("products.seller_id", userId);
  const relevantListings = (listingRows ?? []).filter((item: { quality_score: number | null }) => item.quality_score != null);
  const completedOrders = orders?.filter((order: { status: string }) => order.status === "completed").length ?? 0;
  const cancelledOrders = orders?.filter((order: { status: string }) => order.status === "cancelled" || order.status === "canceled").length ?? 0;
  const disputeCount = disputes?.length ?? 0;
  const listingQuality = relevantListings.length
    ? Math.round(relevantListings.reduce((sum: number, item: { quality_score: number | null }) => sum + Number(item.quality_score ?? 0), 0) / relevantListings.length)
    : 70;
  const profileCreatedAt = profileRows?.created_at ? new Date(profileRows.created_at) : null;
  const isNewAccount = profileCreatedAt ? Date.now() - profileCreatedAt.getTime() < 24 * 60 * 60 * 1000 : false;
  const recentRiskTotal = (riskEvents ?? []).reduce((sum: number, event: { score: number | null }) => sum + Number(event.score ?? 0), 0);
  const highActivityPenalty = isNewAccount && recentRiskTotal > 20 ? 12 : 0;
  const disputePenalty = Math.min(25, disputeCount * 8);
  const cancellationPenalty = Math.min(15, cancelledOrders * 5);
  const riskScore = Math.min(100, Math.round(recentRiskTotal + highActivityPenalty + disputePenalty + cancellationPenalty));

  const sellerRating = existing?.seller_rating ?? 4.5;
  const responseTimeHours = existing?.response_time_hours ?? 24;
  const trustScore = Math.max(0, Math.min(100, Math.round(
    (verifiedEmail ? 20 : 0) +
    Math.min(25, completedOrders * 5) +
    Number(sellerRating) * 12 +
    Math.max(0, 100 - responseTimeHours * 2) * 0.3 +
    listingQuality * 0.3 -
    riskScore * 0.5
  )));

  const payload = {
    user_id: userId,
    trust_score: trustScore,
    risk_score: riskScore,
    verified_email: verifiedEmail,
    completed_orders: completedOrders,
    seller_rating: sellerRating,
    response_time_hours: responseTimeHours,
    dispute_rate: Math.min(100, disputeCount > 0 ? (disputeCount / Math.max(1, completedOrders + cancelledOrders + 1)) * 100 : 0),
    cancellation_rate: Math.min(100, cancelledOrders > 0 ? (cancelledOrders / Math.max(1, completedOrders + cancelledOrders + 1)) * 100 : 0),
    listing_quality_score: listingQuality,
    last_updated: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase.from("user_trust_scores").upsert(payload, { onConflict: "user_id" }).select().single();
    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}

export async function getAdminModerationOverview() {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    return {
      highRiskUsers: [],
      blockedAttempts: 0,
      suspiciousListings: 0,
      trustScore: 0,
      riskScore: 0,
    };
  }

  const [{ data: highRiskUsers }, blockedAttemptsResult, suspiciousListingsResult, { data: trustRows }] = await Promise.all([
    supabase.from("user_trust_scores").select("user_id, trust_score, risk_score").order("risk_score", { ascending: false }).limit(5),
    supabase.from("blocked_chat_attempts").select("id", { count: "exact", head: true }),
    supabase.from("suspicious_listing_flags").select("id", { count: "exact", head: true }),
    supabase.from("user_trust_scores").select("trust_score, risk_score"),
  ]);

  const blockedAttempts = blockedAttemptsResult.count ?? 0;
  const suspiciousListings = suspiciousListingsResult.count ?? 0;
  const averageTrust = trustRows?.length ? Math.round(trustRows.reduce((sum: number, item: { trust_score: number | null }) => sum + Number(item.trust_score ?? 0), 0) / trustRows.length) : 0;
  const averageRisk = trustRows?.length ? Math.round(trustRows.reduce((sum: number, item: { risk_score: number | null }) => sum + Number(item.risk_score ?? 0), 0) / trustRows.length) : 0;

  return {
    highRiskUsers: highRiskUsers ?? [],
    blockedAttempts,
    suspiciousListings,
    trustScore: averageTrust,
    riskScore: averageRisk,
  };
}
