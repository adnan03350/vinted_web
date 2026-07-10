import nextDynamic from "next/dynamic";
import { AppShell } from "@/components/app-shell";
import { BackButton } from "@/components/back-button";
import { getAvailableProducts } from "@/lib/services/catalog-service";
import { buildPageMetadata } from "@/lib/seo/metadata";

const BrowseClient = nextDynamic(() => import("@/components/browse-client").then((mod) => mod.BrowseClient), {
  loading: () => <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-slate-500">Loading marketplace...</div>,
});

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata(
  "Browse listings",
  "Search the marketplace with semantic, image, and voice discovery.",
  "/browse"
);

export default async function BrowsePage() {
  const products = await getAvailableProducts(120);

  return (
    <div className="min-h-screen bg-slate-50">
      <AppShell>
        <div id="main-content" className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          <BackButton />
          <BrowseClient products={products} />
        </div>
      </AppShell>
    </div>
  );
}
