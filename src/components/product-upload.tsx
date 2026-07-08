"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, X, ArrowRight, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { createProduct } from "@/lib/supabase/actions";
import { categories, conditionOptions, countries, currencies } from "@/lib/constants/marketplace";

function isImageFile(file: File) {
  const type = file.type.toLowerCase();
  if (type.startsWith("image/")) return true;
  if (/\.(jpe?g|png|gif|webp|heic|heif|bmp|avif)$/i.test(file.name)) return true;
  // Some phones send photos with empty MIME type
  if (!type && file.size > 0) return true;
  return false;
}

function canPreviewInBrowser(file: File) {
  const type = file.type.toLowerCase();
  if (type.startsWith("image/") && !/heic|heif/i.test(type)) return true;
  return /\.(jpe?g|png|gif|webp|bmp|avif)$/i.test(file.name);
}

function PhotoPreview({
  file,
  index,
  onRemove,
}: {
  file: File;
  index: number;
  onRemove: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!canPreviewInBrowser(file)) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
      <div className="aspect-square">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt={file.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center">
            <ImageIcon className="h-8 w-8 text-slate-400" />
            <p className="text-xs text-slate-500">Photo added</p>
            <p className="truncate text-xs font-medium text-slate-700">{file.name}</p>
          </div>
        )}
      </div>
      {index === 0 ? (
        <span className="absolute left-2 top-2 rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          Cover
        </span>
      ) : null}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${file.name}`}
        className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-slate-700 shadow-sm transition hover:bg-white"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="border-t border-slate-200 bg-white px-2 py-1.5">
        <p className="truncate text-xs font-medium text-slate-700">{file.name}</p>
        <p className="text-[11px] text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
      </div>
    </div>
  );
}

export function ProductUploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const addFiles = (incoming: File[]) => {
    const valid = incoming.filter(isImageFile);
    if (valid.length === 0 && incoming.length > 0) {
      toast.error("Please choose a JPG, PNG, or WEBP image.");
      return;
    }
    if (valid.length === 0) return;

    setFiles((prev) => {
      const combined = [...prev, ...valid];
      if (combined.length > 8) {
        toast.error("You can upload up to 8 photos.");
        return combined.slice(0, 8);
      }
      return combined;
    });
    toast.success(`${valid.length} photo${valid.length > 1 ? "s" : ""} added`);
  };

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    addFiles(Array.from(event.dataTransfer.files));
  };

  const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(event.target.files || []));
    event.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const totalSize = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);

  const requirements = {
    photo: files.length > 0,
    title: formValues.title.trim().length >= 3,
    description: formValues.description.trim().length >= 5,
    price: Number(formValues.price) > 0,
  };

  const canPublish = Object.values(requirements).every(Boolean);

  const missingRequirements = [
    !requirements.photo ? "Upload at least one photo" : null,
    !requirements.title ? "Title must be at least 3 characters" : null,
    !requirements.description ? "Description must be at least 5 characters" : null,
    !requirements.price ? "Enter a valid price" : null,
  ].filter(Boolean) as string[];

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canPublish) {
      toast.error(missingRequirements[0] || "Complete all required fields.");
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

      const result = await createProduct(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
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

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.heic,.heif"
        className="hidden"
        onChange={handleFiles}
      />

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        className={`cursor-pointer rounded-[1.5rem] border-2 border-dashed p-8 text-center transition ${
          dragActive ? "border-orange-500 bg-orange-50" : "border-slate-200 bg-slate-50 hover:border-slate-300"
        }`}
      >
        <UploadCloud className="mx-auto h-8 w-8 text-slate-500" />
        <p className="mt-3 text-sm font-medium text-slate-700">Tap or click to upload photos</p>
        <p className="text-sm text-slate-500">PNG, JPG, WEBP up to 10MB each</p>
        <span className="mt-4 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          Choose photos
        </span>
      </div>

      {files.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span className="font-medium text-emerald-600">{files.length} photo(s) ready</span>
            <span>{(totalSize / 1024 / 1024).toFixed(2)} MB</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {files.map((file, index) => (
              <PhotoPreview
                key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                file={file}
                index={index}
                onRemove={() => removeFile(index)}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-sm font-medium text-orange-600 hover:text-orange-700"
          >
            + Add more photos
          </button>
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
        <div className="space-y-2">
          {canPublish ? (
            <p className="text-sm text-emerald-600">Ready to publish your listing.</p>
          ) : (
            <>
              <p className="text-sm font-medium text-slate-700">Complete these to publish:</p>
              <ul className="space-y-1 text-sm text-slate-500">
                <li className={requirements.photo ? "text-emerald-600" : "text-orange-600"}>
                  {requirements.photo ? "✓" : "○"} At least one photo
                </li>
                <li className={requirements.title ? "text-emerald-600" : "text-orange-600"}>
                  {requirements.title ? "✓" : "○"} Title (min 3 characters)
                </li>
                <li className={requirements.description ? "text-emerald-600" : "text-orange-600"}>
                  {requirements.description ? "✓" : "○"} Description (min 5 characters)
                </li>
                <li className={requirements.price ? "text-emerald-600" : "text-orange-600"}>
                  {requirements.price ? "✓" : "○"} Valid price
                </li>
              </ul>
            </>
          )}
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Publishing..." : "Publish listing"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
