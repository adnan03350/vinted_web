import { ProductUploadForm } from "@/components/product-upload";
import { BackButton } from "@/components/back-button";
import { SiteHeader } from "@/components/site-header";

export default function SellPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <BackButton />
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-600">Sell an item</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Publish a fresh listing to your region</h1>
          <p className="mt-3 text-sm text-slate-500">Upload multiple images, provide details, and go live instantly.</p>
        </div>
        <ProductUploadForm />
      </main>
    </div>
  );
}
