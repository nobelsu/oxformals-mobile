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
