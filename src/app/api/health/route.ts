import { NextResponse } from "next/server";
import { validateEnv, hasSupabase } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = validateEnv();
  const started = Date.now();

  let database: "ok" | "degraded" | "down" = "degraded";
  if (hasSupabase()) {
    try {
      const { createServiceRoleClient } = await import("@/lib/supabase/server");
      const client = createServiceRoleClient();
      if (client) {
        const { error } = await client.from("profiles").select("id", { head: true, count: "exact" });
        database = error ? "degraded" : "ok";
      } else {
        database = "degraded";
      }
    } catch {
      database = "down";
    }
  }

  const healthy = env.ok && database !== "down";
  const body = {
    status: healthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptimeMs: process.uptime() * 1000,
    latencyMs: Date.now() - started,
    checks: {
      environment: env.ok ? "ok" : "missing_required",
      database,
    },
    integrations: env.integrations,
    missingEnv: env.missingRequired,
    missingRecommended: env.missingRecommended,
  };

  return NextResponse.json(body, { status: healthy ? 200 : 503 });
}
