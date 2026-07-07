"use client";

import { useMemo, useState } from "react";
import { UploadCloud, X, Sparkles, ShieldCheck, ArrowRight, Wand2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { createProduct } from "@/lib/supabase/actions";
import { analyzeListing } from "@/lib/ai/listing-analysis";

export function ProductUploadForm() {
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [reviewStage, setReviewStage] = useState(false);
  const [formValues, setFormValues] = useState({ title: "", description: "", brand: "", price: "", currency: "PKR", category: "Women", condition: "Used", country: "Pakistan", is_negotiable: false });

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const droppedFiles = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith("image/"));
    setFiles((prev) => [...prev, ...droppedFiles]);
  };

  const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/"));
    setFiles((prev) => [...prev, ...selected]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const totalSize = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);

  const runAnalysis = async () => {
    if (files.length === 0) {
      toast.error("Upload at least one image to let the AI assistant analyze the listing");
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = analyzeListing(files, {
        category: formValues.category,
        brand: formValues.brand || null,
        condition: formValues.condition,
        price: formValues.price,
      });
      setAnalysis(result);
      setFormValues((prev) => ({
        ...prev,
        title: result.title,
        description: result.description,
        brand: result.brand || prev.brand,
        category: result.category,
        condition: result.condition,
        price: String(result.priceEstimates.fairMarketPrice),
      }));
      setReviewStage(true);
      toast.success("AI analysis ready. Review the generated details and publish.");
    } catch (error: any) {
      toast.error(error.message || "AI analysis was not available");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const formData = new FormData(event.currentTarget);
      files.forEach((file) => formData.append("images", file));
      if (analysis) {
        formData.append("ai_analysis", JSON.stringify(analysis));
      }
      await createProduct(formData);
      toast.success("Product published successfully");
      event.currentTarget.reset();
      setFiles([]);
      setAnalysis(null);
      setReviewStage(false);
      setFormValues({ title: "", description: "", brand: "", price: "", currency: "PKR", category: "Women", condition: "Used", country: "Pakistan", is_negotiable: false });
    } catch (error: any) {
      toast.error(error.message || "Unable to publish product");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-700">
          <Sparkles className="h-4 w-4" />
          AI selling assistant
        </div>
        <h2 className="text-2xl font-semibold text-slate-900">Create a listing with AI assistance</h2>
        <p className="text-sm text-slate-500">Upload images, let the assistant infer the details, review the output, and publish in minutes.</p>
      </div>

      <div onDragOver={(event) => { event.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)} onDrop={onDrop} className={`rounded-[1.5rem] border-2 border-dashed p-8 text-center ${dragActive ? "border-orange-500 bg-orange-50" : "border-slate-200 bg-slate-50"}`}>
        <UploadCloud className="mx-auto h-8 w-8 text-slate-500" />
        <p className="mt-3 text-sm font-medium text-slate-700">Drag and drop your images here</p>
        <p className="text-sm text-slate-500">PNG, JPG, WEBP up to 10MB each</p>
        <label className="mt-4 inline-flex cursor-pointer rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          Choose files
          <input type="file" multiple accept="image/*" className="hidden" onChange={handleFiles} />
        </label>
      </div>

      {files.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>{files.length} image(s) added</span>
            <span>{(totalSize / 1024 / 1024).toFixed(2)} MB</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {files.map((file, index) => (
              <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-2xl border border-slate-200 p-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button type="button" onClick={() => removeFile(index)} className="rounded-full bg-slate-100 p-2 text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">AI analysis</p>
            <p className="text-sm text-slate-500">Generate title, description, trust signals, pricing, and quality insights.</p>
          </div>
          <button type="button" onClick={runAnalysis} disabled={isAnalyzing || files.length === 0} className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
            {isAnalyzing ? "Analyzing images..." : "Analyze listing"}
            <Sparkles className="h-4 w-4" />
          </button>
        </div>

        {analysis ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-green-200 bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Quality score</div>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{analysis.qualityScore.overall}/100</p>
              <p className="text-sm text-slate-500">Images, title, description, and trust combined.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><ShieldCheck className="h-4 w-4 text-orange-600" />Risk score</div>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{analysis.riskScore}/100</p>
              <p className="text-sm text-slate-500">{analysis.riskFlags.length > 0 ? analysis.riskFlags[0] : "No obvious concerns detected"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Wand2 className="h-4 w-4 text-slate-700" />Suggested price</div>
              <p className="mt-2 text-3xl font-semibold text-slate-900">PKR {analysis.priceEstimates.fairMarketPrice}</p>
              <p className="text-sm text-slate-500">Confidence {Math.round(analysis.priceEstimates.confidence * 100)}%</p>
            </div>
          </div>
        ) : null}
      </div>

      {analysis ? (
        <div className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-gradient-to-br from-slate-950 to-slate-800 p-5 text-white">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-300">AI review</p>
              <h3 className="text-xl font-semibold">Review the generated listing</h3>
            </div>
            <button type="button" onClick={() => setReviewStage((value) => !value)} className="rounded-full border border-white/15 px-3 py-2 text-sm font-semibold text-slate-100">
              {reviewStage ? "Hide review" : "Show review"}
            </button>
          </div>

          {reviewStage ? (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-200">
                  Professional title
                  <input name="title" value={formValues.title} onChange={(event) => setFormValues((prev) => ({ ...prev, title: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-slate-400" />
                </label>
                <label className="block text-sm font-medium text-slate-200">
                  Brand
                  <input name="brand" value={formValues.brand} onChange={(event) => setFormValues((prev) => ({ ...prev, brand: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-slate-400" />
                </label>
              </div>

              <label className="block text-sm font-medium text-slate-200">
                Description
                <textarea name="description" value={formValues.description} onChange={(event) => setFormValues((prev) => ({ ...prev, description: event.target.value }))} className="mt-2 min-h-32 w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-slate-400" />
              </label>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="block text-sm font-medium text-slate-200">
                  Price
                  <input name="price" type="number" value={formValues.price} onChange={(event) => setFormValues((prev) => ({ ...prev, price: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-slate-400" />
                </label>
                <label className="block text-sm font-medium text-slate-200">
                  Currency
                  <select name="currency" value={formValues.currency} onChange={(event) => setFormValues((prev) => ({ ...prev, currency: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white">
                    <option className="text-slate-900">PKR</option><option className="text-slate-900">INR</option><option className="text-slate-900">BDT</option><option className="text-slate-900">AED</option><option className="text-slate-900">SAR</option><option className="text-slate-900">MYR</option><option className="text-slate-900">IDR</option><option className="text-slate-900">PHP</option>
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-200">
                  Category
                  <select name="category" value={formValues.category} onChange={(event) => setFormValues((prev) => ({ ...prev, category: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white">
                    <option className="text-slate-900">Women</option><option className="text-slate-900">Men</option><option className="text-slate-900">Kids</option><option className="text-slate-900">Shoes</option><option className="text-slate-900">Bags</option><option className="text-slate-900">Electronics</option><option className="text-slate-900">Home</option><option className="text-slate-900">Sports</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-200">
                  Condition
                  <select name="condition" value={formValues.condition} onChange={(event) => setFormValues((prev) => ({ ...prev, condition: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white">
                    <option className="text-slate-900">New</option><option className="text-slate-900">Like New</option><option className="text-slate-900">Good</option><option className="text-slate-900">Used</option>
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-200">
                  Country
                  <select name="country" value={formValues.country} onChange={(event) => setFormValues((prev) => ({ ...prev, country: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white">
                    <option className="text-slate-900">Pakistan</option><option className="text-slate-900">India</option><option className="text-slate-900">Bangladesh</option><option className="text-slate-900">UAE</option><option className="text-slate-900">Saudi Arabia</option><option className="text-slate-900">Malaysia</option><option className="text-slate-900">Indonesia</option><option className="text-slate-900">Philippines</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-sm font-semibold text-white">Product highlights</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    {analysis.highlights.map((item: string) => <li key={item} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" />{item}</li>)}
                  </ul>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-sm font-semibold text-white">Price intelligence</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    <li>Fair market: PKR {analysis.priceEstimates.fairMarketPrice}</li>
                    <li>Quick sale: PKR {analysis.priceEstimates.quickSalePrice}</li>
                    <li>Premium: PKR {analysis.priceEstimates.premiumListingPrice}</li>
                    <li>{analysis.priceEstimates.rationale}</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-500">{analysis ? "The assistant has prepared the listing for review." : "Start with a few clear images to unlock the assistant."}</div>
        <button disabled={isLoading || !analysis} className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
          {isLoading ? "Publishing..." : "Publish listing"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
