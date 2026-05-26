import type { Id } from "@/convex/_generated/dataModel";

export const IMAGE_FILE_MAX_BYTES = 5 * 1024 * 1024;

export const IMAGE_FILE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

const ALLOWED_IMAGE_FILE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export type ImageFileAsset = {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
};

export function isImageContentType(contentType: string | undefined): boolean {
  return !!contentType && ALLOWED_IMAGE_FILE_TYPES.has(contentType);
}

export function validateImageFileAsset(file: ImageFileAsset): string | null {
  if (!ALLOWED_IMAGE_FILE_TYPES.has(file.mimeType)) {
    return "Please choose an image (JPEG, PNG, WebP, or GIF).";
  }
  if (file.size > IMAGE_FILE_MAX_BYTES) {
    return "Image must be 5 MB or smaller.";
  }
  return null;
}

export async function uploadImageFileMobile(
  file: ImageFileAsset,
  generateUploadUrl: () => Promise<string>,
): Promise<Id<"_storage">> {
  const validationError = validateImageFileAsset(file);
  if (validationError) throw new Error(validationError);

  const uploadUrl = await generateUploadUrl();
  const blob = await fetch(file.uri).then((r) => r.blob());

  if (blob.size > IMAGE_FILE_MAX_BYTES) {
    throw new Error("Image must be 5 MB or smaller.");
  }

  const result = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": file.mimeType },
    body: blob,
  });

  if (!result.ok) {
    throw new Error("Could not upload image. Try again.");
  }

  const { storageId } = (await result.json()) as { storageId: Id<"_storage"> };
  return storageId;
}
