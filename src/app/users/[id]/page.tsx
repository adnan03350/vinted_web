import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { BackButton } from "@/components/back-button";
import { ProductCard } from "@/components/product-card";
import { ProductSocial } from "@/components/product-social";
import { createServerSupabaseClient, getServerUser } from "@/lib/supabase/server";
import { getFollowersCount, isFollowing } from "@/lib/services/social-service";
import { getRatingSummary } from "@/lib/services/review-service";

async function getShop(userId: string) {
  const supabase = await createServerSupabaseClient();
  const [{ data: profile }, { data: products }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase
      .from("products")
      .select("*, product_images(*), profiles!seller_id(full_name)")
      .eq("seller_id", userId)
      .eq("status", "available")
      .order("created_at", { ascending: false })
      .limit(24),
  ]);
  return { profile, products: products ?? [] };
}

export default async function UserShopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getServerUser();
  const { profile, products } = await getShop(id);

  if (!profile) notFound();

  const [followers, following, rating] = await Promise.all([
    getFollowersCount(id),
    isFollowing(viewer?.id, id),
    getRatingSummary("seller", id),
  ]);

  const displayName = profile.full_name || "Seller";
  const initials = displayName
    .split(" ")
    .map((part: string) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const isOwnShop = viewer?.id === id;

  return (
    <div className="min-h-screen bg-slate-50">
      <AppShell>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <BackButton href="/browse" label="Back to browse" />

          <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-xl font-semibold text-white">
                  {initials || "S"}
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-600">Seller shop</p>
                  <h1 className="text-2xl font-semibold text-slate-900">{displayName}</h1>
                  <p className="text-sm text-slate-500">
                    {profile.country || "—"} • {rating.average || 0} ★ ({rating.count}) • {followers} follower
                    {followers === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {isOwnShop ? (
                  <Link href="/profile" className="rounded-full bg-slate-900 px-5 py-3 font-semibold text-white">
                    My profile
                  </Link>
                ) : viewer ? (
                  <>
                    <Link
                      href={`/chat?seller=${id}`}
                      className="rounded-full border border-slate-200 px-5 py-3 font-semibold text-slate-700"
                    >
                      Message
                    </Link>
                    {products[0] ? (
                      <ProductSocial
                        sellerId={id}
                        productId={products[0].id}
                        initialFollowing={following}
                        initialSaved={false}
                        followersCount={followers}
                        compact
                      />
                    ) : null}
                  </>
                ) : (
                  <Link href="/auth/login" className="rounded-full bg-slate-900 px-5 py-3 font-semibold text-white">
                    Sign in to follow
                  </Link>
                )}
              </div>
            </div>
          </section>

          <section className="mt-8">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">
              {isOwnShop ? "Your active listings" : `${displayName}'s closet`}
            </h2>
            {products.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                {products.map((product: any) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                No active listings right now.
              </div>
            )}
          </section>
        </main>
      </AppShell>
    </div>
  );
}
