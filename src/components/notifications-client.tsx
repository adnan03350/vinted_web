"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Bell } from "lucide-react";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/lib/supabase/commerce-actions";

export function NotificationsClient({ notifications }: { notifications: any[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const markAll = async () => {
    setBusy(true);
    try {
      await markAllNotificationsReadAction();
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const markOne = async (id: string) => {
    await markNotificationReadAction(id);
    router.refresh();
  };

  if (!notifications.length) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
        <Bell className="mx-auto h-8 w-8 text-slate-400" />
        <h2 className="mt-3 text-lg font-semibold text-slate-900">No notifications yet</h2>
        <p className="mt-1 text-sm text-slate-500">Order, shipping, payment, and social updates will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={markAll} disabled={busy} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60">
          <CheckCheck className="h-4 w-4" />
          Mark all read
        </button>
      </div>
      <div className="space-y-3">
        {notifications.map((item) => (
          <button
            key={item.id}
            onClick={() => markOne(item.id)}
            className={`block w-full rounded-[1.5rem] border p-5 text-left shadow-sm transition ${item.is_read ? "border-slate-200 bg-white" : "border-orange-200 bg-orange-50"}`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-slate-900">{item.title || item.type}</p>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">{item.type}</span>
            </div>
            <p className="mt-1 text-sm text-slate-600">{item.content}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
