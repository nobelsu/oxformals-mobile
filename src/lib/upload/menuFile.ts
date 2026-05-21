import type { Id } from "@/convex/_generated/dataModel";

export const MENU_FILE_MAX_BYTES = 5 * 1024 * 1024;

export const MENU_FILE_ACCEPT =
  "application/pdf,image/jpeg,image/png,image/webp,image/gif";

const ALLOWED_MENU_FILE_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function isMenuImageContentType(contentType: string | undefined): boolean {
  return !!contentType?.startsWith("image/");
}

export function menuFileLabel(contentType: string | undefined): string {
  if (contentType === "application/pdf") return "PDF";
  if (isMenuImageContentType(contentType)) return "image";
  return "file";
}

export function validateMenuFile(file: File): string | null {
  if (!ALLOWED_MENU_FILE_TYPES.has(file.type)) {
    return "Please choose a PDF or image (JPEG, PNG, WebP, or GIF).";
  }
  if (file.size > MENU_FILE_MAX_BYTES) {
    return "File must be 5 MB or smaller.";
  }
  return null;
}

export async function uploadMenuFile(
  file: File,
  generateUploadUrl: () => Promise<string>,
): Promise<Id<"_storage">> {
  const validationError = validateMenuFile(file);
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
    throw new Error("Could not upload file. Try again.");
  }

  const { storageId } = (await result.json()) as { storageId: Id<"_storage"> };
  return storageId;
}
