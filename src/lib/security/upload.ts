const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGES_PER_LISTING = 8;

export type UploadValidationResult =
  | { ok: true }
  | { ok: false; error: string };

export function validateImageFile(file: File): UploadValidationResult {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return { ok: false, error: "Only JPEG, PNG, WebP, and GIF images are allowed." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Each image must be 10 MB or smaller." };
  }
  if (file.size === 0) {
    return { ok: false, error: "Empty files cannot be uploaded." };
  }
  return { ok: true };
}

export function validateImageBatch(files: File[]): UploadValidationResult {
  if (files.length === 0) {
    return { ok: false, error: "At least one product image is required." };
  }
  if (files.length > MAX_IMAGES_PER_LISTING) {
    return { ok: false, error: `You can upload up to ${MAX_IMAGES_PER_LISTING} images.` };
  }
  for (const file of files) {
    const result = validateImageFile(file);
    if (!result.ok) return result;
  }
  return { ok: true };
}
