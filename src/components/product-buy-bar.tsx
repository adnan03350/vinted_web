"use client";

import { useRouter } from "next/navigation";
import { MessageCircle, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { createOrder } from "@/lib/supabase/actions";

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

  const buyNow = async () => {
    try {
      await createOrder(productId);
      toast.success("Order placed — payment held in escrow");
      router.push("/orders");
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || "Unable to place order. Sign in and try again.");
      if (error?.message?.includes("Authentication")) {
        router.push("/auth/login");
      }
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
          onClick={() => router.push(`/chat?seller=${sellerId}`)}
          className="rounded-full border border-slate-200 p-3 text-slate-700"
          aria-label="Message seller"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={buyNow}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
        >
          <ShoppingBag className="h-4 w-4" />
          Buy
        </button>
      </div>
    </div>
  );
}
