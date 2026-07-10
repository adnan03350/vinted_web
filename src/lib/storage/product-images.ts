import type { SupabaseClient } from "@supabase/supabase-js";
import { v4 as uuid } from "uuid";

const BUCKET = "product-images";

type UploadResult = { ok: true; url: string } | { ok: false; error: string };

function extensionFor(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^(jpe?g|png|gif|webp|avif)$/.test(fromName)) return fromName === "jpeg" ? "jpg" : fromName;
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "jpg";
}

async function uploadImageToCloudinary(image: File, folder: string): Promise<UploadResult | null> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) return null;

  const arrayBuffer = await image.arrayBuffer();
  const body = new FormData();
  body.append("file", new Blob([Buffer.from(arrayBuffer)]), image.name || "photo.jpg");
  body.append("upload_preset", uploadPreset);
  body.append("folder", folder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body,
  });

  let uploadData: { secure_url?: string; error?: { message?: string } } = {};
  try {
    uploadData = await response.json();
  } catch {
    return { ok: false, error: "Cloudinary returned an invalid response." };
  }

  if (!response.ok || !uploadData.secure_url) {
    return {
      ok: false,
      error: uploadData.error?.message || "Cloudinary upload failed. Check your cloud name and upload preset.",
    };
  }

  return { ok: true, url: uploadData.secure_url };
}

async function ensureProductImagesBucket(service: SupabaseClient) {
  const { data: buckets } = await service.storage.listBuckets();
  if (buckets?.some((bucket) => bucket.name === BUCKET || bucket.id === BUCKET)) return;

  await service.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
  });
}

async function uploadImageToSupabase(
  service: SupabaseClient,
  image: File,
  folder: string
): Promise<UploadResult> {
  await ensureProductImagesBucket(service);

  const ext = extensionFor(image);
  const path = `${folder}/${uuid()}.${ext}`;
  const buffer = Buffer.from(await image.arrayBuffer());

  const { error } = await service.storage.from(BUCKET).upload(path, buffer, {
    contentType: image.type || "image/jpeg",
    upsert: false,
  });

  if (error) {
    return {
      ok: false,
      error:
        error.message.includes("Bucket not found")
          ? "Image storage bucket missing. Run supabase-storage-migration.sql in Supabase."
          : error.message,
    };
  }

  const { data } = service.storage.from(BUCKET).getPublicUrl(path);
  if (!data.publicUrl) {
    return { ok: false, error: "Unable to get public image URL from Supabase Storage." };
  }

  return { ok: true, url: data.publicUrl };
}

export async function uploadListingImage(
  service: SupabaseClient,
  image: File,
  folder: string
): Promise<UploadResult> {
  const cloudinaryResult = await uploadImageToCloudinary(image, folder);
  if (cloudinaryResult?.ok) return cloudinaryResult;
  if (cloudinaryResult && !cloudinaryResult.ok) return cloudinaryResult;

  return uploadImageToSupabase(service, image, folder);
}
