import type { Id } from "@/convex/_generated/dataModel";

export const MENU_FILE_MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_MENU_FILE_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export type MenuFileAsset = {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
};

export function validateMenuFileAsset(file: MenuFileAsset): string | null {
  if (!ALLOWED_MENU_FILE_TYPES.has(file.mimeType)) {
    return "Please choose a PDF or image (JPEG, PNG, WebP, or GIF).";
  }
  if (file.size > MENU_FILE_MAX_BYTES) {
    return "File must be 5 MB or smaller.";
  }
  return null;
}

export async function uploadMenuFileMobile(
  file: MenuFileAsset,
  generateUploadUrl: () => Promise<string>,
): Promise<Id<"_storage">> {
  const validationError = validateMenuFileAsset(file);
  if (validationError) throw new Error(validationError);

  const uploadUrl = await generateUploadUrl();
  const blob = await fetch(file.uri).then((r) => r.blob());

  const result = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": file.mimeType },
    body: blob,
  });

  if (!result.ok) {
    throw new Error("Could not upload file. Try again.");
  }

  const { storageId } = (await result.json()) as { storageId: Id<"_storage"> };
  return storageId;
}
