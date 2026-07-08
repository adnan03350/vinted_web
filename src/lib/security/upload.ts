const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGES_PER_LISTING = 8;

const EXTENSION_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
};

export type UploadValidationResult =
  | { ok: true }
  | { ok: false; error: string };

function resolveImageMime(file: File): string | null {
  const type = file.type.toLowerCase();
  if (ALLOWED_IMAGE_TYPES.has(type)) return type;
  if (type === "application/octet-stream") {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext && EXTENSION_MIME[ext]) return EXTENSION_MIME[ext];
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext && EXTENSION_MIME[ext]) return EXTENSION_MIME[ext];
  // Mobile cameras sometimes send empty MIME type
  if (!type && file.size > 0) return "image/jpeg";
  return null;
}

export function validateImageFile(file: File): UploadValidationResult {
  if (!resolveImageMime(file)) {
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
