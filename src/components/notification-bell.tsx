"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { getUnreadCountAction } from "@/lib/supabase/commerce-actions";

export function NotificationBell() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    getUnreadCountAction()
      .then((value) => {
        if (active) setCount(value);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <Link href="/notifications" aria-label="Notifications" className="relative rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-100">
      <Bell className="h-4 w-4" />
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-semibold text-white">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Link>
  );
}
