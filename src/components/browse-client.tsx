"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Sparkles, Mic, Wand2, Camera, Loader2, ImageIcon } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { EmptyState } from "@/components/empty-state";
import { categories, conditionOptions, countries } from "@/lib/constants/marketplace";
import { searchProducts } from "@/lib/ai/search-services";
import { searchByImage } from "@/lib/ai/image-search-service";
import { searchByVoice } from "@/lib/ai/voice-search-service";
import { recordImageSearch, recordVoiceSearch } from "@/lib/supabase/actions";

type ImageSearchState = {
  products: any[];
  detectedQuery: string;
  confidence: number;
  resultCount: number;
  imageName: string;
};

function LoadingGrid() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-72 animate-pulse rounded-3xl border border-slate-200 bg-white" />
      ))}
    </div>
  );
}

export function BrowseClient({ products }: { products: any[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [country, setCountry] = useState("All");
  const [condition, setCondition] = useState("All");
  const [price, setPrice] = useState(100000);
  const [active, setActive] = useState(false);

  const [imageSearch, setImageSearch] = useState<ImageSearchState | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(12);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const searchResult = useMemo(() => {
    if (!query.trim()) return null;
    return searchProducts(query, products);
  }, [query, products]);

  const visibleProducts = useMemo(() => {
    const baseProducts = imageSearch
      ? imageSearch.products
      : searchResult?.products.length
        ? searchResult.products
        : products;
    return baseProducts.filter((product: any) => {
      const matchesCategory = category === "All" || product.category === category;
      const matchesCountry = country === "All" || product.country === country;
      const matchesCondition = condition === "All" || product.condition === condition;
      const matchesPrice = price >= 100000 || Number(product.price) <= price;
      return matchesCategory && matchesCountry && matchesCondition && matchesPrice;
    });
  }, [category, condition, country, price, products, searchResult, imageSearch]);

  // Reset the progressive window whenever the result set changes.
  useEffect(() => {
    setVisibleCount(12);
  }, [query, category, country, condition, price, imageSearch]);

  // Infinite scroll: grow the visible window as the sentinel enters the viewport.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((count) => count + 12);
        }
      },
      { rootMargin: "400px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visibleProducts.length]);

  const shownProducts = visibleProducts.slice(0, visibleCount);
  const hasMore = visibleCount < visibleProducts.length;

  const handleQueryChange = (value: string) => {
    if (imageSearch) setImageSearch(null);
    setQuery(value);
  };

  const handleImageFile = async (file: File | undefined) => {
    if (!file) return;
    setVoiceNotice(null);
    setQuery("");
    setIsAnalyzingImage(true);
    try {
      // Yield a frame so the loading state paints before the sync analysis runs.
      await new Promise((resolve) => setTimeout(resolve, 250));
      const result = searchByImage(file, products);
      setImageSearch({
        products: result.products,
        detectedQuery: result.detectedQuery,
        confidence: result.confidence,
        resultCount: result.resultCount,
        imageName: file.name,
      });
      void recordImageSearch({
        imageName: file.name,
        detectedQuery: result.detectedQuery,
        features: result.features,
        resultCount: result.resultCount,
        confidence: result.confidence,
      }).catch(() => {});
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition =
      (typeof window !== "undefined" && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) || null;
    if (!SpeechRecognition) {
      setVoiceNotice("Voice search is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setVoiceNotice(null);
    setIsListening(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? "";
      const { query: voiceQuery, result } = searchByVoice(transcript, products);
      setImageSearch(null);
      setQuery(voiceQuery);
      void recordVoiceSearch({
        transcript,
        query: voiceQuery,
        resultCount: result.products.length,
        confidence: result.analytics.confidence,
      }).catch(() => {});
    };
    recognition.onerror = () => {
      setIsListening(false);
      setVoiceNotice("We couldn't hear that. Please try again.");
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          void handleImageFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      <div className="mb-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-600">AI browse</p>
            <h1 className="text-3xl font-semibold text-slate-900">Find the right match with semantic, image, and voice search</h1>
            <p className="mt-2 text-sm text-slate-500">Type, speak, or upload a photo — the assistant understands your intent.</p>
          </div>
          <div className="flex w-full max-w-2xl flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-3">
              <Search className="h-4 w-4 text-slate-500" />
              <input
                value={query}
                onChange={(event) => handleQueryChange(event.target.value)}
                onFocus={() => setActive(true)}
                onBlur={() => setTimeout(() => setActive(false), 120)}
                placeholder="Try “gaming laptop under $700” or “used iPhone in good condition”"
                className="w-full bg-transparent outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isAnalyzingImage}
                aria-label="Search by image"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAnalyzingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                <span className="sm:hidden lg:inline">Image</span>
              </button>
              <button
                type="button"
                onClick={handleVoiceSearch}
                disabled={isListening}
                aria-label="Search by voice"
                className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed ${isListening ? "animate-pulse bg-orange-600" : "bg-slate-900"}`}
              >
                <Mic className="h-4 w-4" />
                <span className="sm:hidden lg:inline">{isListening ? "Listening" : "Voice"}</span>
              </button>
            </div>
          </div>
        </div>

        {voiceNotice ? <p className="mt-3 text-sm font-medium text-orange-700">{voiceNotice}</p> : null}

        {active && query && !imageSearch ? (
          <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Sparkles className="h-4 w-4 text-orange-500" />
              Intelligent suggestions
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(searchResult?.autocomplete || []).slice(0, 6).map((item) => (
                <button key={item} type="button" onMouseDown={() => handleQueryChange(item)} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                  {item}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mb-6 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {imageSearch ? (
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ImageIcon className="h-4 w-4 text-orange-500" />
                Visual match for “{imageSearch.imageName}”
              </p>
              <p className="text-sm text-slate-500">
                {imageSearch.detectedQuery ? `Detected ${imageSearch.detectedQuery} • ` : ""}
                {Math.round(imageSearch.confidence * 100)}% confidence
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-slate-900">Semantic intent</p>
              <p className="text-sm text-slate-500">
                {query
                  ? `Understanding “${query}” with ${searchResult?.analytics.confidence ? Math.round(searchResult.analytics.confidence * 100) : 0}% confidence`
                  : "Search for natural language requests and the experience will adapt."}
              </p>
            </div>
          )}
          {query || imageSearch ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-700">
              <Wand2 className="h-4 w-4" />
              {visibleProducts.length} smart matches
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="space-y-6">
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Category</h2>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none">
                <option value="All">All categories</option>
                {categories.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Country</h2>
              <select value={country} onChange={(e) => setCountry(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none">
                <option value="All">All countries</option>
                {countries.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Condition</h2>
              <select value={condition} onChange={(e) => setCondition(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none">
                <option value="All">Any condition</option>
                {conditionOptions.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Maximum price</h2>
              <input type="range" min="500" max="100000" step="500" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="w-full accent-orange-500" />
              <p className="mt-2 text-sm text-slate-500">{price >= 100000 ? "Any price" : `Up to ${price.toLocaleString()}`}</p>
            </div>
          </div>
        </aside>

        <section className="space-y-4">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <p>{isAnalyzingImage ? "Analyzing image..." : `${visibleProducts.length} smart listings found`}</p>
            <p>{imageSearch ? "Ranked by visual similarity" : "Ranked by relevance and intent"}</p>
          </div>
          {isAnalyzingImage ? (
            <LoadingGrid />
          ) : visibleProducts.length > 0 ? (
            <>
              <div className="grid gap-6 md:grid-cols-2">
                {shownProducts.map((product: any) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              {hasMore ? (
                <div ref={sentinelRef} className="flex justify-center py-6 text-sm text-slate-400">
                  Loading more listings...
                </div>
              ) : null}
            </>
          ) : imageSearch ? (
            <EmptyState title="No visually similar listings found" description="We couldn't match this image to current listings. Try another photo or search by text." />
          ) : (
            <EmptyState title="No listings match your filters" description="Try widening your price range or changing the category." />
          )}
        </section>
      </div>
    </main>
  );
}
