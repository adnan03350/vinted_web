"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateProfileAction } from "@/lib/supabase/commerce-actions";
import { countries } from "@/lib/constants/marketplace";

export function SettingsForm({
  initial,
}: {
  initial: { full_name: string; country: string; email: string };
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await updateProfileAction(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Profile updated");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="rounded-2xl border border-slate-200 p-4">
        <h2 className="font-semibold text-slate-900">Account</h2>
        <p className="mt-1 text-sm text-slate-500">Update how buyers see you on ThriftAsia.</p>
        <div className="mt-4 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              value={values.email}
              disabled
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Display name
            <input
              value={values.full_name}
              onChange={(e) => setValues((v) => ({ ...v, full_name: e.target.value }))}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Country
            <select
              value={values.country}
              onChange={(e) => setValues((v) => ({ ...v, country: e.target.value }))}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              {countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 p-4">
        <h2 className="font-semibold text-slate-900">Notifications</h2>
        <p className="mt-2 text-sm text-slate-500">
          Order updates, messages, and new followers appear in your inbox bell. Email alerts send when Resend is configured on the server.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 p-4">
        <h2 className="font-semibold text-slate-900">Buyer protection</h2>
        <p className="mt-2 text-sm text-slate-500">
          Payments are held in escrow until you confirm delivery. Sellers ship after payment is secured.
        </p>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="rounded-full bg-slate-900 px-6 py-3 font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
