import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MessageCircle, ShieldCheck, Star } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { BackButton } from "@/components/back-button";
import { ProductSocial } from "@/components/product-social";
import { ProductReviews } from "@/components/product-reviews";
import { ProductBuyBar } from "@/components/product-buy-bar";
import { JsonLd } from "@/components/json-ld";
import { createServerSupabaseClient, getServerUser } from "@/lib/supabase/server";
import { trackProductView } from "@/lib/ai/user-activity";
import { getFollowersCount, isFollowing, isProductSaved } from "@/lib/services/social-service";
import { getReviews, getRatingSummary } from "@/lib/services/review-service";
import { buildProductMetadata } from "@/lib/seo/metadata";
import { buildProductJsonLd } from "@/lib/seo/structured-data";
import { messageSellerFromProduct, requestProductOrder } from "@/lib/supabase/actions";
import { notFound } from "next/navigation";

export const revalidate = 120;

async function getProduct(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("products")
    .select("*, product_images(*), profiles!seller_id(full_name, country, avatar_url, created_at)")
    .eq("id", id)
    .maybeSingle();
  return data;
}

function formatDate(value: string | null) {
  if (!value) return "Recently";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Recently" : parsed.toLocaleDateString();
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) return { title: "Product not found" };

  const images = product.product_images ?? [];
  const primaryImage =
    images.find((image: { is_primary?: boolean; image_url: string }) => image.is_primary)?.image_url ||
    images[0]?.image_url;

  return buildProductMetadata({
    id,
    title: product.title,
    description: product.description,
    price: product.price,
    currency: product.currency,
    image: primaryImage,
  });
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    notFound();
  }

  void trackProductView(id).catch(() => {});

  const user = await getServerUser();
  const sellerId = product.seller_id as string;
  const [followersCount, following, saved, reviews, ratingSummary] = await Promise.all([
    getFollowersCount(sellerId),
    isFollowing(user?.id, sellerId),
    isProductSaved(user?.id, id),
    getReviews("product", id),
    getRatingSummary("product", id),
  ]);

  const images: { image_url: string; is_primary?: boolean }[] = product.product_images ?? [];
  const primaryImage =
    images.find((image) => image.is_primary)?.image_url ||
    images[0]?.image_url ||
    "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80";
  const additionalImages = images.filter((image) => image.image_url !== primaryImage);
  const sellerName = product.profiles?.full_name || "Seller";
  const sellerInitials = sellerName
    .split(" ")
    .map((part: string) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50">
      <JsonLd
        data={buildProductJsonLd({
          id,
          title: product.title,
          description: product.description,
          price: product.price,
          currency: product.currency,
          image: primaryImage,
          condition: product.condition,
          sellerName,
        })}
      />
      <AppShell>
        <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6 lg:px-8">
          <BackButton href="/browse" label="Back to browse" />

        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
              <div className="relative h-[420px] w-full">
                <Image
                  src={primaryImage}
                  alt={product.title}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  className="object-cover"
                />
              </div>
            </div>
            {additionalImages.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-3">
                {additionalImages.map((image) => (
                  <div key={image.image_url} className="relative h-28 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
                    <Image src={image.image_url} alt={`${product.title} detail`} fill sizes="200px" className="object-cover" />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="rounded-full bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-700">{product.category}</p>
                <p className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">{product.condition}</p>
              </div>
              <h1 className="mt-4 text-3xl font-semibold text-slate-900">{product.title}</h1>
              <p className="mt-3 text-sm leading-6 text-slate-500">{product.description}</p>
              <div className="mt-6 flex items-end justify-between">
                <div>
                  <p className="text-sm text-slate-500">Price</p>
                  <p className="text-3xl font-semibold text-slate-900">{product.price} {product.currency}</p>
                </div>
                {product.is_negotiable ? <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">Negotiable</span> : null}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <form action={requestProductOrder}>
                  <input type="hidden" name="productId" value={id} />
                  <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
                    Buy now — {product.price} {product.currency}
                  </button>
                </form>
                <form action={messageSellerFromProduct}>
                  <input type="hidden" name="sellerId" value={sellerId} />
                  <button type="submit" className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    Message seller
                  </button>
                </form>
              </div>
              <div className="mt-6 border-t border-slate-100 pt-6">
                <ProductSocial
                  sellerId={sellerId}
                  productId={id}
                  initialFollowing={following}
                  initialSaved={saved}
                  followersCount={followersCount}
                />
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <Link href={`/users/${sellerId}`} className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white" aria-hidden="true">{sellerInitials || "S"}</div>
                <div>
                  <p className="font-semibold text-slate-900">{sellerName}</p>
                  <p className="text-sm text-slate-500">{product.country} • View shop →</p>
                </div>
              </Link>
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                <Star className="h-4 w-4 text-orange-500" aria-hidden="true" />
                <span>Member since {formatDate(product.profiles?.created_at)}</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">{followersCount} follower{followersCount === 1 ? "" : "s"}</p>
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
                <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                Verified regional shipping and pickup support.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <ProductReviews productId={id} reviews={reviews} summary={ratingSummary} />
        </div>
        </main>
        <ProductBuyBar
          productId={id}
          price={Number(product.price)}
          currency={product.currency}
          sellerId={sellerId}
          isOwner={user?.id === sellerId}
        />
      </AppShell>
    </div>
  );
}
