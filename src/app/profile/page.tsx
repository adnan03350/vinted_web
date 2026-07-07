import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { BackButton } from "@/components/back-button";
import { ProductCard } from "@/components/product-card";
import { createServerSupabaseClient, getServerUser } from "@/lib/supabase/server";
import { getFollowersCount } from "@/lib/services/social-service";
import { getRatingSummary } from "@/lib/services/review-service";

async function getSellerData(userId: string) {
  const supabase = await createServerSupabaseClient();
  const [{ data: profile }, { data: products }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase
      .from("products")
      .select("*, product_images(*), profiles!seller_id(full_name)")
      .eq("seller_id", userId)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);
  return { profile, products: products ?? [] };
}

export default async function ProfilePage() {
  const user = await getServerUser();

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <BackButton />
          <div className="py-8 text-center">
            <h1 className="text-2xl font-semibold text-slate-900">Sign in to view your profile</h1>
            <p className="mt-2 text-sm text-slate-500">Manage your listings, followers, and seller reputation.</p>
            <Link href="/auth/login" className="mt-6 inline-flex rounded-full bg-slate-900 px-5 py-3 font-semibold text-white">Sign in</Link>
          </div>
        </main>
      </div>
    );
  }

  const [{ profile, products }, followers, rating] = await Promise.all([
    getSellerData(user.id),
    getFollowersCount(user.id),
    getRatingSummary("seller", user.id),
  ]);

  const displayName = profile?.full_name || user.email || "Seller";
  const initials = displayName.split(" ").map((part: string) => part[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <BackButton />
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-xl font-semibold text-white">{initials || "S"}</div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-600">Seller profile</p>
                <h1 className="text-2xl font-semibold text-slate-900">{displayName}</h1>
                <p className="text-sm text-slate-500">
                  {profile?.country || "—"} • {rating.average || 0} ★ ({rating.count}) • {followers} follower{followers === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            <Link href="/settings" className="rounded-full bg-slate-900 px-5 py-3 font-semibold text-white">Edit profile</Link>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Your listings</h2>
          {products.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {products.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              You have no listings yet. <Link href="/sell" className="font-semibold text-slate-900">Create your first listing</Link>.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
