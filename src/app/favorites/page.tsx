import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { BackButton } from "@/components/back-button";
import { ProductCard } from "@/components/product-card";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { getSavedProducts } from "@/lib/services/social-service";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata("Saved items", "Your favorite listings on ThriftAsia.", "/favorites");

export default async function FavoritesPage() {
  const user = await requireAuthenticatedUser();
  const saved = await getSavedProducts(user.id);
  const products = saved.map((row: any) => row.products).filter(Boolean);

  return (
    <div className="min-h-screen bg-slate-50">
      <AppShell>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <BackButton />
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-600">Saved</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Your favorite items</h1>
            <p className="mt-2 text-sm text-slate-500">
              {products.length} saved listing{products.length === 1 ? "" : "s"}
            </p>
          </div>

          {products.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {products.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-10 text-center">
              <p className="text-sm text-slate-500">No saved items yet.</p>
              <Link
                href="/browse"
                className="mt-4 inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
              >
                Browse listings
              </Link>
            </div>
          )}
        </main>
      </AppShell>
    </div>
  );
}
