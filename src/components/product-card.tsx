import Link from "next/link";
import Image from "next/image";
import type { ProductRecord } from "@/types";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80";

export function ProductCard({ product }: { product: ProductRecord }) {
  const images = product.product_images ?? [];
  const primaryImage =
    images.find((image) => image.is_primary)?.image_url || images[0]?.image_url || FALLBACK_IMAGE;
  const sellerName = product.profiles?.full_name || "Seller";

  return (
    <Link href={`/products/${product.id}`} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
      <div className="relative h-48 overflow-hidden">
        <Image
          src={primaryImage}
          alt={product.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
          className="object-cover transition duration-300 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 z-10 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700">{product.category}</span>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-slate-900">{product.title}</h3>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{product.condition}</span>
        </div>
        <p className="line-clamp-2 text-sm text-slate-500">{product.description}</p>
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>{product.country}</span>
          <span className="font-semibold text-slate-900">{product.price} {product.currency}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">by {sellerName}</span>
        </div>
      </div>
    </Link>
  );
}
