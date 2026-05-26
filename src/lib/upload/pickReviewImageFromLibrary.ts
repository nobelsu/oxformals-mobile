import { compressImage } from "@/src/lib/media/compressImage";
import { openPhotoLibrary } from "@/src/lib/media/openPhotoLibrary";
import {
  IMAGE_FILE_MAX_BYTES,
  type ImageFileAsset,
  validateImageFileAsset,
} from "@/lib/upload/imageFile";

export type PickReviewImageResult =
  | { ok: true; asset: ImageFileAsset }
  | {
      ok: false;
      reason: "permission" | "cancelled" | "invalid" | "failed";
      message?: string;
    };

export async function pickReviewImageFromLibrary(): Promise<PickReviewImageResult> {
  const launch = await openPhotoLibrary({
    mediaTypes: ["images"],
    allowsEditing: false,
    quality: 1,
  });

  if (!launch.ok) {
    return { ok: false, reason: launch.reason };
  }

  const { result } = launch;
  if (result.canceled || !result.assets[0]?.uri) {
    return { ok: false, reason: "cancelled" };
  }

  const asset = result.assets[0];

  try {
    const compressed = await compressImage(asset.uri, {
      maxWidth: 2048,
      quality: 0.85,
      maxBytes: IMAGE_FILE_MAX_BYTES,
    });

    const imageAsset: ImageFileAsset = {
      uri: compressed.uri,
      name: asset.fileName?.replace(/\.\w+$/i, ".jpg") ?? "photo.jpg",
      mimeType: "image/jpeg",
      size: compressed.size,
    };

    const validationError = validateImageFileAsset(imageAsset);
    if (validationError) {
      return { ok: false, reason: "invalid", message: validationError };
    }

    return { ok: true, asset: imageAsset };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
