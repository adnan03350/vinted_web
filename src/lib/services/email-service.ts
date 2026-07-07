import { logger } from "@/lib/monitoring/logger";

export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail(payload: EmailPayload) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    logger.debug("Email skipped — RESEND_API_KEY or EMAIL_FROM not configured", {
      to: payload.to,
      subject: payload.subject,
    });
    return { sent: false, reason: "not_configured" as const };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text ?? payload.subject,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error("Email delivery failed", { status: response.status, errorText });
    return { sent: false, reason: "provider_error" as const };
  }

  return { sent: true as const };
}

export function buildNotificationEmail(title: string, content: string, link?: string | null) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const href = link?.startsWith("http") ? link : link ? `${appUrl}${link}` : appUrl;

  return {
    subject: title,
    html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a"><h2>${title}</h2><p>${content}</p>${
      link ? `<p><a href="${href}">View in ThriftAsia</a></p>` : ""
    }</body></html>`,
    text: `${title}\n\n${content}${link ? `\n\n${href}` : ""}`,
  };
}
