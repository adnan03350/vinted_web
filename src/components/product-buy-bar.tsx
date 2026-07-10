"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { buyProductAction, messageSellerAction } from "@/lib/supabase/commerce-actions";

export function ProductBuyBar({
  productId,
  price,
  currency,
  sellerId,
  isOwner,
}: {
  productId: string;
  price: number;
  currency: string;
  sellerId: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"buy" | "message" | null>(null);

  const buyNow = async () => {
    setBusy("buy");
    try {
      const result = await buyProductAction(productId);
      if (!result.ok) {
        toast.error(result.error);
        if (result.error.toLowerCase().includes("sign in")) router.push("/auth/login");
        return;
      }
      toast.success("Order placed — payment held in escrow");
      router.push(result.redirectUrl || "/orders");
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  const messageSeller = async () => {
    setBusy("message");
    try {
      const result = await messageSellerAction(sellerId);
      if (!result.ok) {
        toast.error(result.error);
        if (result.error.toLowerCase().includes("sign in")) router.push("/auth/login");
        return;
      }
      router.push(result.redirectUrl || "/chat");
    } finally {
      setBusy(null);
    }
  };

  if (isOwner) {
    return (
      <div className="fixed inset-x-0 bottom-16 z-40 border-t border-slate-200 bg-white/95 p-4 backdrop-blur md:hidden">
        <p className="text-center text-sm text-slate-500">This is your listing</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-16 z-40 border-t border-slate-200 bg-white/95 p-4 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-500">Buy now</p>
          <p className="text-lg font-semibold text-slate-900">
            {price} {currency}
          </p>
        </div>
        <button
          type="button"
          onClick={messageSeller}
          disabled={!!busy}
          className="rounded-full border border-slate-200 p-3 text-slate-700 disabled:opacity-60"
          aria-label="Message seller"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={buyNow}
          disabled={!!busy}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          <ShoppingBag className="h-4 w-4" />
          {busy === "buy" ? "..." : "Buy"}
        </button>
      </div>
    </div>
  );
}
