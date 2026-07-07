import { SiteHeader } from "@/components/site-header";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-600">Settings</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Manage your preferences</h1>
          </div>
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 p-4">
              <h2 className="font-semibold text-slate-900">Notifications</h2>
              <p className="mt-2 text-sm text-slate-500">Choose how you receive new messages, order updates, and price drop alerts.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <h2 className="font-semibold text-slate-900">Payment preferences</h2>
              <p className="mt-2 text-sm text-slate-500">Cash on delivery, bank transfer, and wallet options can be connected here.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <h2 className="font-semibold text-slate-900">Verification</h2>
              <p className="mt-2 text-sm text-slate-500">Identity checks and seller badges are available for trusted transactions.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
