import { AppShell } from "@/components/app-shell";
import { ProductUploadForm } from "@/components/product-upload";
import { BackButton } from "@/components/back-button";

export default function SellPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <AppShell>
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <BackButton />
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-600">Sell an item</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Post your ad</h1>
            <p className="mt-3 text-sm text-slate-500">Upload photos, enter details, and publish — just like Vinted.</p>
          </div>
          <ProductUploadForm />
        </main>
      </AppShell>
    </div>
  );
}
