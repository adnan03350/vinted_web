"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { buyProductAction, messageSellerAction } from "@/lib/supabase/commerce-actions";

export function ProductPageActions({
  productId,
  sellerId,
  price,
  currency,
  isOwner,
}: {
  productId: string;
  sellerId: string;
  price: number;
  currency: string;
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
        if (result.error.toLowerCase().includes("sign in")) {
          router.push("/auth/login");
        }
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
        if (result.error.toLowerCase().includes("sign in")) {
          router.push("/auth/login");
        }
        return;
      }
      router.push(result.redirectUrl || "/chat");
    } finally {
      setBusy(null);
    }
  };

  if (isOwner) {
    return (
      <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">This is your listing.</p>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={buyNow}
        disabled={!!busy}
        className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        <ShoppingBag className="h-4 w-4" />
        {busy === "buy" ? "Processing..." : `Buy now — ${price} ${currency}`}
      </button>
      <button
        type="button"
        onClick={messageSeller}
        disabled={!!busy}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-60"
      >
        <MessageCircle className="h-4 w-4" />
        {busy === "message" ? "Opening..." : "Message seller"}
      </button>
    </div>
  );
}
