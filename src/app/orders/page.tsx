import { SiteHeader } from "@/components/site-header";
import { getUserOrders } from "@/lib/ai/escrow";
import { getServerUser } from "@/lib/supabase/server";
import { getWallet, getWalletTransactions } from "@/lib/services/wallet-service";
import { WalletPanel, OrderReturnButton } from "@/components/order-actions";

export default async function OrdersPage() {
  const user = await getServerUser();
  const orders = user ? await getUserOrders(user.id) : [];
  const wallet = user ? await getWallet(user.id) : null;
  const transactions = user ? await getWalletTransactions(user.id) : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-600">Orders</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Track buyer requests and confirmed purchases</h1>
        </div>

        {user ? (
          <WalletPanel
            balance={Number(wallet?.balance ?? 0)}
            currency={wallet?.currency ?? "USD"}
            transactionCount={transactions.length}
          />
        ) : null}

        <div className="space-y-4">
          {orders.length > 0 ? orders.map((order: any) => {
            const isBuyer = user?.id === order.buyer_id;
            return (
              <div key={order.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{order.products?.title || order.id}</p>
                    <p className="text-sm text-slate-500">Buyer: {order.buyer_id} • Seller: {order.seller_id}</p>
                  </div>
                  <div className="text-sm text-slate-500 sm:text-right">
                    <p>{order.amount} {order.currency}</p>
                    <p className="mt-1 font-semibold text-slate-900">{order.status}</p>
                  </div>
                </div>
                {isBuyer && ["DELIVERED", "SHIPPED", "RELEASED_TO_SELLER", "BUYER_APPROVED"].includes(order.status) ? (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <OrderReturnButton orderId={order.id} />
                  </div>
                ) : null}
              </div>
            );
          }) : <p className="rounded-[1.5rem] border border-slate-200 bg-white p-5 text-sm text-slate-500">No escrow orders yet.</p>}
        </div>
      </main>
    </div>
  );
}
