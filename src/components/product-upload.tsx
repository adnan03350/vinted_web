"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, X, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { createProduct } from "@/lib/supabase/actions";
import { categories, conditionOptions, countries, currencies } from "@/lib/constants/marketplace";

export function ProductUploadForm() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formValues, setFormValues] = useState({
    title: "",
    description: "",
    brand: "",
    price: "",
    currency: "PKR",
    category: "Women",
    condition: "Used",
    country: "Pakistan",
    is_negotiable: false,
  });

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

  const canPublish =
    files.length > 0 &&
    formValues.title.trim().length >= 3 &&
    formValues.description.trim().length >= 10 &&
    Number(formValues.price) > 0;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canPublish) {
      toast.error("Add at least one photo, title, description, and price.");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.set("title", formValues.title);
      formData.set("description", formValues.description);
      formData.set("brand", formValues.brand);
      formData.set("price", formValues.price);
      formData.set("currency", formValues.currency);
      formData.set("category", formValues.category);
      formData.set("condition", formValues.condition);
      formData.set("country", formValues.country);
      if (formValues.is_negotiable) {
        formData.set("is_negotiable", "on");
      }
      files.forEach((file) => formData.append("images", file));

      await createProduct(formData);
      toast.success("Listing published successfully");
      setFiles([]);
      setFormValues({
        title: "",
        description: "",
        brand: "",
        price: "",
        currency: "PKR",
        category: "Women",
        condition: "Used",
        country: "Pakistan",
        is_negotiable: false,
      });
      router.push("/browse");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Unable to publish listing");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-600">Post your ad</p>
        <h2 className="text-2xl font-semibold text-slate-900">Sell your item</h2>
        <p className="text-sm text-slate-500">Add photos and details yourself — just like OLX.</p>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        className={`rounded-[1.5rem] border-2 border-dashed p-8 text-center ${dragActive ? "border-orange-500 bg-orange-50" : "border-slate-200 bg-slate-50"}`}
      >
        <UploadCloud className="mx-auto h-8 w-8 text-slate-500" />
        <p className="mt-3 text-sm font-medium text-slate-700">Upload photos of your item</p>
        <p className="text-sm text-slate-500">PNG, JPG, WEBP up to 10MB each</p>
        <label className="mt-4 inline-flex cursor-pointer rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          Choose photos
          <input type="file" multiple accept="image/*" className="hidden" onChange={handleFiles} />
        </label>
      </div>

      {files.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>{files.length} photo(s) added</span>
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

      <div className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
        <label className="block text-sm font-medium text-slate-700">
          Title
          <input
            name="title"
            value={formValues.title}
            onChange={(event) => setFormValues((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="e.g. Used cotton shirt for women"
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
            required
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Description
          <textarea
            name="description"
            value={formValues.description}
            onChange={(event) => setFormValues((prev) => ({ ...prev, description: event.target.value }))}
            placeholder="Describe condition, size, color, and any defects..."
            className="mt-2 min-h-32 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
            required
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Brand <span className="font-normal text-slate-400">(optional)</span>
          <input
            name="brand"
            value={formValues.brand}
            onChange={(event) => setFormValues((prev) => ({ ...prev, brand: event.target.value }))}
            placeholder="e.g. Nike, Zara"
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Price
            <input
              name="price"
              type="number"
              min="1"
              value={formValues.price}
              onChange={(event) => setFormValues((prev) => ({ ...prev, price: event.target.value }))}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Currency
            <select
              name="currency"
              value={formValues.currency}
              onChange={(event) => setFormValues((prev) => ({ ...prev, currency: event.target.value }))}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              {currencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Category
            <select
              name="category"
              value={formValues.category}
              onChange={(event) => setFormValues((prev) => ({ ...prev, category: event.target.value }))}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Condition
            <select
              name="condition"
              value={formValues.condition}
              onChange={(event) => setFormValues((prev) => ({ ...prev, condition: event.target.value }))}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              {conditionOptions.map((condition) => (
                <option key={condition} value={condition}>
                  {condition}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block text-sm font-medium text-slate-700">
          Country
          <select
            name="country"
            value={formValues.country}
            onChange={(event) => setFormValues((prev) => ({ ...prev, country: event.target.value }))}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
          >
            {countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={formValues.is_negotiable}
            onChange={(event) => setFormValues((prev) => ({ ...prev, is_negotiable: event.target.checked }))}
            className="h-4 w-4 rounded border-slate-300"
          />
          Price is negotiable
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Fill in all details and upload at least one photo.</p>
        <button
          type="submit"
          disabled={isLoading || !canPublish}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Publishing..." : "Publish listing"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
