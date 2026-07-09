"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Package, Truck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  approveOrderAction,
  markOrderDeliveredAction,
  markOrderShippedAction,
  openDisputeAction,
} from "@/lib/supabase/commerce-actions";

const STEPS = ["PENDING_HELD", "SHIPPED", "DELIVERED", "BUYER_APPROVED", "RELEASED_TO_SELLER"];

function stepIndex(status: string) {
  if (status === "PAYMENT_PENDING") return 0;
  if (["PENDING_HELD", "SHIPPED", "DELIVERED", "BUYER_APPROVED", "RELEASED_TO_SELLER"].includes(status)) {
    return Math.max(0, STEPS.indexOf(status === "PAYMENT_PENDING" ? "PENDING_HELD" : status));
  }
  return -1;
}

export function OrderStatusStepper({ status }: { status: string }) {
  const current = stepIndex(status);
  const labels = ["Paid", "Shipped", "Delivered", "Approved", "Released"];

  if (["DISPUTED", "REFUNDED", "CANCELLED"].includes(status)) {
    return (
      <div className="rounded-2xl bg-orange-50 px-4 py-3 text-sm font-medium text-orange-800">
        Order status: {status.replace(/_/g, " ")}
      </div>
    );
  }

  return (
    <ol className="grid grid-cols-5 gap-1">
      {labels.map((label, index) => {
        const done = current >= index;
        return (
          <li key={label} className="text-center">
            <div
              className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                done ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
              }`}
            >
              {index + 1}
            </div>
            <p className={`mt-1 text-[10px] ${done ? "text-slate-900" : "text-slate-400"}`}>{label}</p>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderDetailActions({
  orderId,
  status,
  role,
}: {
  orderId: string;
  status: string;
  role: "buyer" | "seller";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, action: () => Promise<{ ok: boolean; error?: string }>) => {
    setBusy(key);
    try {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error || "Action failed");
        return;
      }
      toast.success("Order updated");
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || "Action failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {role === "seller" && ["PENDING_HELD", "PAYMENT_PENDING"].includes(status) ? (
        <button
          type="button"
          disabled={!!busy}
          onClick={() => run("ship", () => markOrderShippedAction(orderId))}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          <Truck className="h-4 w-4" />
          {busy === "ship" ? "Updating..." : "Mark shipped"}
        </button>
      ) : null}

      {role === "buyer" && status === "SHIPPED" ? (
        <button
          type="button"
          disabled={!!busy}
          onClick={() => run("deliver", () => markOrderDeliveredAction(orderId))}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          <Package className="h-4 w-4" />
          {busy === "deliver" ? "Updating..." : "Confirm delivery"}
        </button>
      ) : null}

      {role === "buyer" && ["DELIVERED", "SHIPPED"].includes(status) ? (
        <button
          type="button"
          disabled={!!busy}
          onClick={() => run("approve", () => approveOrderAction(orderId))}
          className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          <CheckCircle2 className="h-4 w-4" />
          {busy === "approve" ? "Releasing..." : "Approve & release payment"}
        </button>
      ) : null}

      {role === "buyer" && !["DISPUTED", "REFUNDED", "RELEASED_TO_SELLER", "BUYER_APPROVED"].includes(status) ? (
        <button
          type="button"
          disabled={!!busy}
          onClick={() => {
            const reason = window.prompt("Why are you opening a dispute?");
            if (!reason?.trim()) return;
            run("dispute", () => openDisputeAction(orderId, reason.trim()));
          }}
          className="inline-flex items-center gap-2 rounded-full border border-orange-200 px-4 py-2 text-sm font-semibold text-orange-700 disabled:opacity-60"
        >
          <AlertTriangle className="h-4 w-4" />
          Open dispute
        </button>
      ) : null}
    </div>
  );
}
