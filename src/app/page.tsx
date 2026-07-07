import Link from "next/link";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { ArrowRight, ShieldCheck, Sparkles, Store, MessageCircleHeart } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
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
  { title: "Trusted local trading", description: "Safe payments, verified profiles, and regional support across Asia.", icon: ShieldCheck },
  { title: "Fast selling flow", description: "Upload in minutes with images, pricing, and condition details.", icon: Sparkles },
  { title: "Built-in chat", description: "Discuss pickup, delivery, or meeting points without leaving the app.", icon: MessageCircleHeart },
];

async function getFeaturedProducts(): Promise<ProductRecord[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, product_images(*), profiles!seller_id(full_name)")
    .eq("status", "available")
    .eq("featured", true)
    .order("created_at", { ascending: false })
    .limit(4);
  if (error) return [];
  return (data ?? []) as ProductRecord[];
}

export default async function HomePage() {
  const products = await getFeaturedProducts();
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.12),_transparent_35%),linear-gradient(135deg,_#f8fafc_0%,_#eef2ff_100%)]">
      <SiteHeader />
      <main id="main-content" className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-6 rounded-[2rem] bg-slate-950 p-8 text-white shadow-2xl lg:grid-cols-[1.2fr_0.8fr] lg:p-12">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-slate-100">
              <Store className="h-4 w-4" aria-hidden="true" />
              New marketplace for Asia
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Buy and sell pre-loved finds across Asia with confidence.</h1>
              <p className="max-w-2xl text-lg text-slate-300">ThriftAsia brings together buyers and sellers from Pakistan, India, Bangladesh, UAE, Saudi Arabia, Malaysia, Indonesia, and the Philippines.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/browse" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 font-semibold text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">Explore listings <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
              <Link href="/sell" className="rounded-full border border-white/20 px-5 py-3 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">Start selling</Link>
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-6 backdrop-blur">
            <div className="grid gap-4">
              {highlights.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-2xl bg-slate-900/70 p-4">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/20 text-orange-400">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h2 className="font-semibold text-white">{item.title}</h2>
                    <p className="mt-1 text-sm text-slate-300">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-600">Featured listings</p>
              <h2 className="text-2xl font-semibold text-slate-900">Fresh from nearby sellers</h2>
            </div>
            <Link href="/browse" className="text-sm font-semibold text-slate-700 hover:text-slate-950">Browse all</Link>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-600">Smart discovery</p>
              <h2 className="text-2xl font-semibold text-slate-900">AI-powered recommendations</h2>
            </div>
          </div>
          <Suspense fallback={null}>
            <RecommendationSections />
          </Suspense>
        </section>
      </main>
    </div>
  );
}
