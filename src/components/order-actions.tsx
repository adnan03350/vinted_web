"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { requestPayoutAction, requestReturnAction } from "@/lib/supabase/commerce-actions";

export function WalletPanel({ balance, currency, transactionCount }: { balance: number; currency: string; transactionCount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const requestPayout = async () => {
    const input = window.prompt("Enter payout amount");
    if (!input) return;
    const amount = Number(input);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setBusy(true);
    try {
      const result = await requestPayoutAction(amount, currency);
      if (!result) {
        toast.error("Insufficient wallet balance for that payout");
      } else {
        toast.success("Payout requested");
        router.refresh();
      }
    } catch (error: any) {
      toast.error(error?.message || "Unable to request payout");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-8 rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Wallet balance</p>
            <p className="text-2xl font-semibold text-slate-900">{balance} {currency}</p>
            <p className="text-xs text-slate-400">{transactionCount} transaction{transactionCount === 1 ? "" : "s"}</p>
          </div>
        </div>
        <button onClick={requestPayout} disabled={busy} className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
          {busy ? "Requesting..." : "Request payout"}
        </button>
      </div>
    </div>
  );
}

export function OrderReturnButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const requestReturn = async () => {
    const reason = window.prompt("Reason for return");
    if (!reason) return;
    setBusy(true);
    try {
      await requestReturnAction(orderId, reason);
      toast.success("Return requested");
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || "Unable to request return");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button onClick={requestReturn} disabled={busy} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60">
      <RotateCcw className="h-4 w-4" />
      {busy ? "Requesting..." : "Request return"}
    </button>
  );
}
