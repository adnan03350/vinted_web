import { SiteHeader } from "@/components/site-header";
import { BackButton } from "@/components/back-button";
import { getAdminModerationOverview } from "@/lib/ai/moderation";
import { getEscrowOverview } from "@/lib/ai/escrow";
import { getAdminPlatformStats } from "@/lib/admin/analytics-service";
import { requireAdminUser } from "@/lib/auth/guards";
import { listPayoutRequests } from "@/lib/services/wallet-service";
import { listReturnRequests, listShippingIssues } from "@/lib/services/shipping-service";
import { listRecentReviews, listReportedReviews } from "@/lib/services/review-service";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata(
  "Admin dashboard",
  "Monitor users, revenue, escrow, fraud signals, and AI marketplace analytics.",
  "/admin"
);

export default async function AdminPage() {
  await requireAdminUser();

  const [platformStats, overview, escrowOverview, payouts, returns, shippingIssues, recentReviews, reportedReviews] =
    await Promise.all([
      getAdminPlatformStats(),
      getAdminModerationOverview(),
      getEscrowOverview(),
      listPayoutRequests(),
      listReturnRequests(),
      listShippingIssues(),
      listRecentReviews(),
      listReportedReviews(),
    ]);

  const stats = [
    { label: "Total users", value: platformStats.totalUsers },
    { label: "Active listings", value: platformStats.activeListings },
    { label: "Total orders", value: platformStats.totalOrders },
    { label: "Platform revenue", value: platformStats.totalRevenue },
    { label: "Escrow orders", value: platformStats.escrowOrders },
    { label: "Open disputes", value: platformStats.openDisputes },
    { label: "High-risk users", value: overview.highRiskUsers.length },
    { label: "Blocked attempts", value: platformStats.blockedAttempts },
    { label: "Suspicious listings", value: platformStats.suspiciousListings },
    { label: "Image searches", value: platformStats.imageSearches },
    { label: "Voice searches", value: platformStats.voiceSearches },
    { label: "Unread notifications", value: platformStats.unreadNotifications },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <BackButton />
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-600">Admin dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Production marketplace overview</h1>
          <p className="mt-2 text-sm text-slate-500">
            Average trust score {platformStats.averageTrustScore} • Average risk score {platformStats.averageRiskScore}
          </p>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">{stat.label}</p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">High-risk users</h2>
            <div className="mt-4 space-y-3">
              {overview.highRiskUsers.length > 0 ? overview.highRiskUsers.map((user: { user_id: string; trust_score: number | null; risk_score: number | null }) => (
                <div key={user.user_id} className="flex items-center justify-between rounded-2xl border border-slate-100 p-3">
                  <div>
                    <p className="font-semibold text-slate-900">{user.user_id}</p>
                    <p className="text-sm text-slate-500">Trust {user.trust_score} • Risk {user.risk_score}</p>
                  </div>
                  <span className="rounded-full bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-700">Needs review</span>
                </div>
              )) : <p className="text-sm text-slate-500">No high-risk users have been flagged yet.</p>}
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">AI analytics</h2>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-slate-100 p-3">
                <p className="font-semibold text-slate-900">Visual search usage</p>
                <p className="mt-1 text-sm text-slate-500">{platformStats.imageSearches} image searches recorded.</p>
              </div>
              <div className="rounded-2xl border border-slate-100 p-3">
                <p className="font-semibold text-slate-900">Voice search usage</p>
                <p className="mt-1 text-sm text-slate-500">{platformStats.voiceSearches} voice searches recorded.</p>
              </div>
              <div className="rounded-2xl border border-slate-100 p-3">
                <p className="font-semibold text-slate-900">Fraud prevention</p>
                <p className="mt-1 text-sm text-slate-500">{platformStats.blockedAttempts} blocked chat attempts and {platformStats.suspiciousListings} suspicious listings.</p>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Payout requests</h2>
            <div className="mt-4 space-y-3">
              {payouts.length > 0 ? payouts.slice(0, 6).map((payout: { id: string; amount: number; currency: string; user_id: string; status: string }) => (
                <div key={payout.id} className="flex items-center justify-between rounded-2xl border border-slate-100 p-3">
                  <div>
                    <p className="font-semibold text-slate-900">{payout.amount} {payout.currency}</p>
                    <p className="text-sm text-slate-500">{payout.user_id}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">{payout.status}</span>
                </div>
              )) : <p className="text-sm text-slate-500">No payout requests yet.</p>}
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Return requests</h2>
            <div className="mt-4 space-y-3">
              {returns.length > 0 ? returns.slice(0, 6).map((request: { id: string; reason?: string; order_id: string; status: string }) => (
                <div key={request.id} className="flex items-center justify-between rounded-2xl border border-slate-100 p-3">
                  <div>
                    <p className="font-semibold text-slate-900">{request.reason || "Return"}</p>
                    <p className="text-sm text-slate-500">Order {request.order_id}</p>
                  </div>
                  <span className="rounded-full bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-700">{request.status}</span>
                </div>
              )) : <p className="text-sm text-slate-500">No return requests yet.</p>}
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Reported reviews</h2>
            <div className="mt-4 space-y-3">
              {reportedReviews.length > 0 ? reportedReviews.slice(0, 6).map((review: { id: string; rating: number; target_type: string; report_reason?: string; comment?: string }) => (
                <div key={review.id} className="rounded-2xl border border-slate-100 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900">{review.rating}★ on {review.target_type}</p>
                    <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-red-600">Reported</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{review.report_reason || review.comment}</p>
                </div>
              )) : <p className="text-sm text-slate-500">No reported reviews.</p>}
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Escrow overview</h2>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-slate-100 p-3">
                <p className="font-semibold text-slate-900">{escrowOverview.escrowOrders} active escrow orders</p>
                <p className="mt-1 text-sm text-slate-500">{escrowOverview.disputes} disputes require attention.</p>
              </div>
              <div className="rounded-2xl border border-slate-100 p-3">
                <p className="font-semibold text-slate-900">Shipping issues</p>
                <p className="mt-1 text-sm text-slate-500">{shippingIssues.returns.length} open returns and {shippingIssues.returned.length} returned shipments.</p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
