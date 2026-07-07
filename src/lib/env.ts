/**
 * Centralised environment access + validation.
 */

export type EnvKey =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME"
  | "NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET"
  | "NEXT_PUBLIC_APP_URL";

const REQUIRED: EnvKey[] = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
];

const RECOMMENDED: string[] = [
  "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
  "NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "SENTRY_DSN",
];

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export function hasSupabase() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function hasServiceRole() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function hasEmailProvider() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export function hasPushProvider() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export function validateEnv() {
  const missingRequired = REQUIRED.filter((key) => !process.env[key]);
  const missingRecommended = RECOMMENDED.filter((key) => !process.env[key]);
  return {
    ok: missingRequired.length === 0,
    missingRequired,
    missingRecommended,
    integrations: {
      supabase: hasSupabase(),
      serviceRole: hasServiceRole(),
      email: hasEmailProvider(),
      push: hasPushProvider(),
    },
  };
}
