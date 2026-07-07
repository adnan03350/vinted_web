import dynamic from "next/dynamic";
import { SiteHeader } from "@/components/site-header";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildPageMetadata } from "@/lib/seo/metadata";

const BrowseClient = dynamic(() => import("@/components/browse-client").then((mod) => mod.BrowseClient), {
  loading: () => <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-slate-500">Loading marketplace...</div>,
});

export const revalidate = 60;

export const metadata = buildPageMetadata(
  "Browse listings",
  "Search the marketplace with semantic, image, and voice discovery.",
  "/browse"
);

async function getBrowseProducts() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("products")
    .select("*, product_images(*), profiles!seller_id(full_name, avatar_url, country)")
    .eq("status", "available")
    .order("created_at", { ascending: false })
    .limit(60);
  return data ?? [];
}

export default async function BrowsePage() {
  const products = await getBrowseProducts();

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <div id="main-content">
        <BrowseClient products={products} />
      </div>
    </div>
  );
}
