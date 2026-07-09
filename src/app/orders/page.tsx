import Link from "next/link";
import Image from "next/image";
import { AppShell } from "@/components/app-shell";
import { BackButton } from "@/components/back-button";
import { getUserOrders } from "@/lib/ai/escrow";
import { getServerUser } from "@/lib/supabase/server";
import { getWallet, getWalletTransactions } from "@/lib/services/wallet-service";
import { WalletPanel, OrderReturnButton } from "@/components/order-actions";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80";

export default async function OrdersPage() {
  const user = await getServerUser();
  const orders = user ? await getUserOrders(user.id) : [];
  const wallet = user ? await getWallet(user.id) : null;
  const transactions = user ? await getWalletTransactions(user.id) : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <AppShell>
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <BackButton />
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-600">Orders</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Your purchases & sales</h1>
            <p className="mt-2 text-sm text-slate-500">Track escrow status, shipping, and payouts.</p>
          </div>

          {user ? (
            <WalletPanel
              balance={Number(wallet?.balance ?? 0)}
              currency={wallet?.currency ?? "PKR"}
              transactionCount={transactions.length}
            />
          ) : (
            <div className="mb-8 rounded-[1.5rem] border border-slate-200 bg-white p-6 text-sm text-slate-500">
              <Link href="/auth/login" className="font-semibold text-slate-900">
                Sign in
              </Link>{" "}
              to view your orders.
            </div>
          )}

          <div className="space-y-4">
            {orders.length > 0 ? (
              orders.map((order: any) => {
                const isBuyer = user?.id === order.buyer_id;
                const product = order.products;
                const images = product?.product_images ?? [];
                const imageUrl =
                  images.find((img: { is_primary?: boolean }) => img.is_primary)?.image_url ||
                  images[0]?.image_url ||
                  FALLBACK_IMAGE;

                return (
                  <div
                    key={order.id}
                    className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <Link href={`/orders/${order.id}`} className="flex gap-4">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl">
                        <Image src={imageUrl} alt={product?.title || "Product"} fill className="object-cover" sizes="80px" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-lg font-semibold text-slate-900">{product?.title || "Order"}</p>
                            <p className="text-sm text-slate-500">
                              {isBuyer ? "You bought this" : "You sold this"} • {order.amount} {order.currency}
                            </p>
                          </div>
                          <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {order.status}
                          </span>
                        </div>
                      </div>
                    </Link>
                    {isBuyer && ["DELIVERED", "SHIPPED", "RELEASED_TO_SELLER", "BUYER_APPROVED"].includes(order.status) ? (
                      <div className="mt-4 border-t border-slate-100 pt-4">
                        <OrderReturnButton orderId={order.id} />
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <p className="rounded-[1.5rem] border border-slate-200 bg-white p-5 text-sm text-slate-500">
                No orders yet.{" "}
                <Link href="/browse" className="font-semibold text-slate-900">
                  Browse listings
                </Link>
                .
              </p>
            )}
          </div>
        </main>
      </AppShell>
    </div>
  );
}
