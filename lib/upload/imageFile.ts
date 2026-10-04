import type { Id } from "../../convex/_generated/dataModel";

export const IMAGE_FILE_MAX_BYTES = 5 * 1024 * 1024;

export const IMAGE_FILE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

const ALLOWED_IMAGE_FILE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function isImageContentType(contentType: string | undefined): boolean {
  return !!contentType && ALLOWED_IMAGE_FILE_TYPES.has(contentType);
}

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_FILE_TYPES.has(file.type)) {
    return "Please choose an image (JPEG, PNG, WebP, or GIF).";
  }
  if (file.size > IMAGE_FILE_MAX_BYTES) {
    return "Image must be 5 MB or smaller.";
  }
  return null;
}

export async function uploadImageFile(
  file: File,
  generateUploadUrl: () => Promise<string>,
): Promise<Id<"_storage">> {
  const validationError = validateImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const uploadUrl = await generateUploadUrl();
  const result = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!result.ok) {
    throw new Error("Could not upload image. Try again.");
  }

  const { storageId } = (await result.json()) as { storageId: Id<"_storage"> };
  return storageId;
}
