import { createServiceRoleClient } from "@/lib/supabase/server";
import { buildNotificationEmail, sendEmail } from "@/lib/services/email-service";
import { sendPushToUser } from "@/lib/services/push-service";
import { logger } from "@/lib/monitoring/logger";

export type NotificationType =
  | "order"
  | "offer"
  | "chat"
  | "shipping"
  | "payment"
  | "dispute"
  | "review"
  | "follow"
  | "system";

export type CreateNotificationInput = {
  userId: string | null | undefined;
  type: NotificationType;
  title: string;
  content: string;
  link?: string | null;
  metadata?: Record<string, unknown>;
};

async function resolveUserEmail(userId: string) {
  const supabase = createServiceRoleClient();
  if (!supabase) return null;
  const { data } = await supabase.from("profiles").select("email").eq("id", userId).maybeSingle();
  return data?.email ?? null;
}

export async function createNotification(input: CreateNotificationInput) {
  const supabase = createServiceRoleClient();
  if (!supabase || !input.userId) return null;

  try {
    const { data } = await supabase
      .from("notifications")
      .insert({
        user_id: input.userId,
        type: input.type,
        title: input.title,
        content: input.content,
        link: input.link ?? null,
        metadata: input.metadata ?? {},
        is_read: false,
      })
      .select()
      .single();

    if (!data) return null;

    const email = await resolveUserEmail(input.userId);
    if (email) {
      const template = buildNotificationEmail(input.title, input.content, input.link);
      void sendEmail({ to: email, ...template }).catch((error) => {
        logger.warn("Notification email failed", { userId: input.userId, error: String(error) });
      });
    }

    void sendPushToUser(input.userId, {
      title: input.title,
      body: input.content,
      url: input.link ?? undefined,
    }).catch((error) => {
      logger.warn("Notification push failed", { userId: input.userId, error: String(error) });
    });

    return data;
  } catch (error) {
    logger.error("Notification creation failed", { error: String(error) });
    return null;
  }
}

export async function getNotifications(userId: string, limit = 30) {
  const supabase = createServiceRoleClient();
  if (!supabase || !userId) return [];
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getUnreadNotificationCount(userId: string) {
  const supabase = createServiceRoleClient();
  if (!supabase || !userId) return 0;
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  return count ?? 0;
}

export async function markNotificationRead(id: string, userId: string) {
  const supabase = createServiceRoleClient();
  if (!supabase) return null;
  await supabase.from("notifications").update({ is_read: true }).eq("id", id).eq("user_id", userId);
  return true;
}

export async function markAllNotificationsRead(userId: string) {
  const supabase = createServiceRoleClient();
  if (!supabase) return null;
  await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
  return true;
}
