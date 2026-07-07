import Link from "next/link";
import { ArrowRight, Sparkles, TrendingUp, Eye, Clock3 } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { getRecommendations } from "@/lib/ai/recommendation-engine";

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded-full bg-slate-200" />
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-72 animate-pulse rounded-[2rem] border border-slate-200 bg-white" />
        ))}
      </div>
    </div>
  );
}

export async function RecommendationSections() {
  const sections = await getRecommendations();

  if (!sections.length) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-600">Recommendations</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-900">No recommendations available yet</h3>
        <p className="mt-2 text-sm text-slate-500">Browse listings and save favorites to build smarter suggestions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <section key={section.key} className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-orange-600">
                {section.key === "trending" ? <TrendingUp className="h-4 w-4" /> : section.key === "similar" ? <Eye className="h-4 w-4" /> : section.key === "price-drop" ? <Clock3 className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                {section.title}
              </div>
              <p className="mt-1 text-sm text-slate-500">{section.description}</p>
            </div>
            <Link href="/browse" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-950">
              Explore all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {section.products.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {section.products.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No products are available for this section right now.</div>
          )}
        </section>
      ))}
    </div>
  );
}
