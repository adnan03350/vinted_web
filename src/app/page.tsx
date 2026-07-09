import Link from "next/link";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { ArrowRight, ShieldCheck, Sparkles, Store, MessageCircleHeart } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ProductCard } from "@/components/product-card";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ProductRecord } from "@/types";

const RecommendationSections = dynamic(
  () => import("@/components/recommendation-sections").then((mod) => mod.RecommendationSections),
  {
    loading: () => (
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-72 animate-pulse rounded-[2rem] border border-slate-200 bg-white" />
        ))}
      </div>
    ),
  }
);

export const revalidate = 60;

const highlights = [
  { title: "Escrow protection", description: "Pay safely — funds release after you confirm delivery.", icon: ShieldCheck },
  { title: "List in minutes", description: "Upload photos, set price, and publish like Vinted.", icon: Sparkles },
  { title: "Chat with sellers", description: "Negotiate and arrange delivery inside the app.", icon: MessageCircleHeart },
];

async function getFeedProducts(): Promise<ProductRecord[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("products")
    .select("*, product_images(*), profiles!seller_id(full_name)")
    .in("status", ["available", "Available"])
    .order("created_at", { ascending: false })
    .limit(24);
  return (data ?? []) as ProductRecord[];
}

export default async function HomePage() {
  const products = await getFeedProducts();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.12),_transparent_35%),linear-gradient(135deg,_#f8fafc_0%,_#eef2ff_100%)]">
      <AppShell>
        <main id="main-content" className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8">
          <section className="grid gap-6 rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl sm:p-8 lg:grid-cols-[1.2fr_0.8fr] lg:p-10">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-slate-100">
                <Store className="h-4 w-4" aria-hidden="true" />
                Vinted-style marketplace for Asia
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Buy & sell pre-loved fashion near you
                </h1>
                <p className="max-w-2xl text-base text-slate-300 sm:text-lg">
                  ThriftAsia — Pakistan, India, Bangladesh, UAE, and across Asia. Browse closets, chat, and buy with buyer protection.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/browse" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 font-semibold text-slate-950">
                  Shop now <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/sell" className="rounded-full border border-white/20 px-5 py-3 font-semibold text-white">
                  Sell an item
                </Link>
              </div>
            </div>
            <div className="grid gap-3">
              {highlights.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-2xl bg-slate-900/70 p-4">
                    <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-orange-500/20 text-orange-400">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h2 className="font-semibold">{item.title}</h2>
                    <p className="mt-1 text-sm text-slate-300">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-600">Fresh listings</p>
                <h2 className="text-2xl font-semibold text-slate-900">Just added near you</h2>
              </div>
              <Link href="/browse" className="text-sm font-semibold text-slate-700 hover:text-slate-950">
                See all
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.length > 0 ? (
                products.map((product) => <ProductCard key={product.id} product={product} />)
              ) : (
                <div className="col-span-full rounded-[2rem] border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
                  No listings yet. <Link href="/sell" className="font-semibold text-slate-900">Be the first seller</Link>.
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-600">For you</p>
              <h2 className="text-2xl font-semibold text-slate-900">Recommended picks</h2>
            </div>
            <Suspense fallback={null}>
              <RecommendationSections />
            </Suspense>
          </section>
        </main>
      </AppShell>
    </div>
  );
}
