"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Flag } from "lucide-react";
import { toast } from "sonner";
import { submitReviewAction, reportReviewAction } from "@/lib/supabase/commerce-actions";

type Summary = { average: number; count: number; distribution: Record<number, number> };

export function ProductReviews({
  productId,
  reviews,
  summary,
  canReview,
  isLoggedIn,
  alreadyReviewed,
}: {
  productId: string;
  reviews: any[];
  summary: Summary;
  canReview: boolean;
  isLoggedIn: boolean;
  alreadyReviewed: boolean;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const result = await submitReviewAction({
        targetType: "product",
        targetId: productId,
        rating,
        comment: comment.trim() || undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        if (result.error.toLowerCase().includes("sign in")) router.push("/auth/login");
        return;
      }
      setComment("");
      setRating(5);
      toast.success("Review submitted");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const report = async (reviewId: string) => {
    const result = await reportReviewAction(reviewId, "Reported from product page", productId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Review reported for moderation");
    router.refresh();
  };

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Reviews</h2>
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Star className="h-4 w-4 text-orange-500" />
          {summary.average || 0} <span className="font-normal text-slate-500">({summary.count})</span>
        </div>
      </div>

      {canReview ? (
        <form onSubmit={submit} className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-emerald-700">You purchased this item — share your review</p>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value} star`}>
                <Star className={`h-6 w-6 ${value <= rating ? "fill-orange-500 text-orange-500" : "text-slate-300"}`} />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={3}
            placeholder="Share your experience with this product"
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
          />
          <button disabled={submitting} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {submitting ? "Submitting..." : "Submit review"}
          </button>
        </form>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          {!isLoggedIn
            ? "Sign in and purchase this item to leave a review."
            : alreadyReviewed
              ? "You already reviewed this item."
              : "Buy this item first, then you can leave a review here."}
        </div>
      )}

      <div className="mt-5 space-y-3">
        {reviews.length > 0 ? (
          reviews.map((review) => (
            <div key={review.id} className="rounded-2xl border border-slate-100 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{review.profiles?.full_name || "Buyer"}</span>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-orange-600">
                    <Star className="h-3.5 w-3.5 fill-orange-500 text-orange-500" />
                    {review.rating}
                  </span>
                </div>
                <button type="button" onClick={() => report(review.id)} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-500">
                  <Flag className="h-3.5 w-3.5" /> Report
                </button>
              </div>
              {review.comment ? <p className="mt-2 text-sm text-slate-600">{review.comment}</p> : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">No reviews yet.</p>
        )}
      </div>
    </div>
  );
}
