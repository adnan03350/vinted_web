import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { BackButton } from "@/components/back-button";
import { SettingsForm } from "@/components/settings-form";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const user = await requireAuthenticatedUser();
  const supabase = await createServerSupabaseClient();
  const { data: profile } = await supabase.from("profiles").select("full_name, country, email").eq("id", user.id).maybeSingle();

  return (
    <div className="min-h-screen bg-slate-50">
      <AppShell>
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <BackButton href="/profile" label="Back to profile" />
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-600">Settings</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">Account & preferences</h1>
            </div>
            <SettingsForm
              initial={{
                full_name: profile?.full_name || "",
                country: profile?.country || "Pakistan",
                email: profile?.email || user.email || "",
              }}
            />
            <div className="mt-8 border-t border-slate-100 pt-6">
              <Link href="/orders" className="text-sm font-semibold text-slate-700 hover:text-slate-900">
                View orders & wallet →
              </Link>
            </div>
          </div>
        </main>
      </AppShell>
    </div>
  );
}
