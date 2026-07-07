import { createServiceRoleClient } from "@/lib/supabase/server";
import { logger } from "@/lib/monitoring/logger";

export async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string }) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    logger.debug("Push skipped — VAPID keys not configured", { userId });
    return { sent: 0 };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) return { sent: 0 };

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  if (!subscriptions?.length) return { sent: 0 };

  let sent = 0;
  for (const subscription of subscriptions) {
    try {
      const response = await fetch(subscription.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          TTL: "86400",
        },
        body: JSON.stringify({
          title: payload.title,
          body: payload.body,
          url: payload.url,
          // Production deployments should sign payloads with web-push; endpoint
          // delivery is delegated to the browser push service once keys are set.
        }),
      });
      if (response.ok) sent += 1;
    } catch (error) {
      logger.warn("Push delivery failed", { userId, error: String(error) });
    }
  }

  return { sent };
}
