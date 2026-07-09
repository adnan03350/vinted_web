import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { BackButton } from "@/components/back-button";
import { OrderDetailActions, OrderStatusStepper } from "@/components/order-detail-actions";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { getOrderById } from "@/lib/ai/escrow";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuthenticatedUser();
  const { id } = await params;
  const order = await getOrderById(id, user.id);

  if (!order) notFound();

  const role = order.buyer_id === user.id ? "buyer" : "seller";
  const product = order.products;
  const images = product?.product_images ?? [];
  const imageUrl =
    images.find((img: { is_primary?: boolean }) => img.is_primary)?.image_url ||
    images[0]?.image_url ||
    FALLBACK_IMAGE;

  return (
    <div className="min-h-screen bg-slate-50">
      <AppShell>
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <BackButton href="/orders" label="Back to orders" />

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex gap-4">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl">
                  <Image src={imageUrl} alt={product?.title || "Product"} fill className="object-cover" sizes="96px" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600">Order</p>
                  <h1 className="text-xl font-semibold text-slate-900">{product?.title || "Listing"}</h1>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {order.amount} {order.currency}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    You are the {role} • Status: <span className="font-medium text-slate-800">{order.status}</span>
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <OrderStatusStepper status={order.status} />
              </div>

              <div className="mt-6 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                <p>
                  <span className="text-slate-400">Buyer:</span> {order.buyer?.full_name || "Buyer"}
                </p>
                <p>
                  <span className="text-slate-400">Seller:</span>{" "}
                  <Link href={`/users/${order.seller_id}`} className="font-medium text-slate-900 hover:underline">
                    {order.seller?.full_name || "Seller"}
                  </Link>
                </p>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-6">
                <OrderDetailActions orderId={order.id} status={order.status} role={role} />
              </div>
            </div>

            {product?.id ? (
              <Link
                href={`/products/${product.id}`}
                className="inline-flex text-sm font-semibold text-orange-600 hover:text-orange-700"
              >
                View listing →
              </Link>
            ) : null}
          </div>
        </main>
      </AppShell>
    </div>
  );
}
