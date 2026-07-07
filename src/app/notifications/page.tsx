import { SiteHeader } from "@/components/site-header";
import { BackButton } from "@/components/back-button";
import { NotificationsClient } from "@/components/notifications-client";
import { getServerUser } from "@/lib/supabase/server";
import { getNotifications } from "@/lib/services/notification-service";

export default async function NotificationsPage() {
  const user = await getServerUser();
  const notifications = user ? await getNotifications(user.id) : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <BackButton />
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-600">Notifications</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Stay on top of orders, shipping, and social activity</h1>
        </div>
        {user ? (
          <NotificationsClient notifications={notifications} />
        ) : (
          <p className="rounded-[1.5rem] border border-slate-200 bg-white p-5 text-sm text-slate-500">Sign in to see your notifications.</p>
        )}
      </main>
    </div>
  );
}
