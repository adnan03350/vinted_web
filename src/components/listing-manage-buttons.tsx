"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteListingAction, markListingSoldAction } from "@/lib/supabase/commerce-actions";

export function ListingManageButtons({ productId, status }: { productId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  if (status === "sold") return null;

  const markSold = async () => {
    setBusy("sold");
    try {
      const result = await markListingSoldAction(productId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Listing marked as sold");
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!window.confirm("Delete this listing permanently?")) return;
    setBusy("delete");
    try {
      const result = await deleteListingAction(productId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Listing deleted");
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={markSold}
        disabled={!!busy}
        className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-60"
      >
        {busy === "sold" ? "..." : "Mark sold"}
      </button>
      <button
        type="button"
        onClick={remove}
        disabled={!!busy}
        className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-60"
      >
        {busy === "delete" ? "..." : "Delete"}
      </button>
    </div>
  );
}
