"use client";

import { useState } from "react";
import { UserPlus, UserCheck, Bookmark, Share2 } from "lucide-react";
import { toast } from "sonner";
import {
  followSellerAction,
  unfollowSellerAction,
  saveProductAction,
  unsaveProductAction,
  shareProductAction,
} from "@/lib/supabase/commerce-actions";

type Props = {
  sellerId: string;
  productId: string;
  initialFollowing: boolean;
  initialSaved: boolean;
  followersCount: number;
};

export function ProductSocial({ sellerId, productId, initialFollowing, initialSaved, followersCount }: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [saved, setSaved] = useState(initialSaved);
  const [followers, setFollowers] = useState(followersCount);
  const [busy, setBusy] = useState(false);

  const toggleFollow = async () => {
    setBusy(true);
    const next = !following;
    setFollowing(next);
    setFollowers((count) => Math.max(0, count + (next ? 1 : -1)));
    try {
      if (next) await followSellerAction(sellerId);
      else await unfollowSellerAction(sellerId);
    } catch (error: any) {
      setFollowing(!next);
      setFollowers((count) => Math.max(0, count + (next ? -1 : 1)));
      toast.error(error?.message || "Please sign in to follow sellers");
    } finally {
      setBusy(false);
    }
  };

  const toggleSave = async () => {
    setBusy(true);
    const next = !saved;
    setSaved(next);
    try {
      if (next) await saveProductAction(productId);
      else await unsaveProductAction(productId);
      toast.success(next ? "Saved to your list" : "Removed from saved");
    } catch (error: any) {
      setSaved(!next);
      toast.error(error?.message || "Please sign in to save products");
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    const url = await shareProductAction(productId);
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ url });
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        toast.success("Share link copied");
      }
    } catch {
      // user dismissed the share sheet; nothing to do
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={toggleFollow}
        disabled={busy}
        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-60 ${following ? "border border-slate-200 bg-white text-slate-700" : "bg-slate-900 text-white"}`}
      >
        {following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
        {following ? "Following" : "Follow"}
        <span className="text-xs font-normal opacity-70">{followers}</span>
      </button>
      <button
        type="button"
        onClick={toggleSave}
        disabled={busy}
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-60 ${saved ? "border-orange-200 bg-orange-50 text-orange-700" : "border-slate-200 bg-white text-slate-700"}`}
      >
        <Bookmark className={`h-4 w-4 ${saved ? "fill-orange-500 text-orange-500" : ""}`} />
        {saved ? "Saved" : "Save"}
      </button>
      <button
        type="button"
        onClick={share}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
      >
        <Share2 className="h-4 w-4" />
        Share
      </button>
    </div>
  );
}
