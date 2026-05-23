import { compressImage } from "@/src/lib/media/compressImage";
import { openPhotoLibrary } from "@/src/lib/media/openPhotoLibrary";

import {
  MENU_FILE_MAX_BYTES,
  type MenuFileAsset,
  validateMenuFileAsset,
} from "@/src/lib/upload/menuFileMobile";

export type PickMenuImageResult =
  | { ok: true; asset: MenuFileAsset }
  | {
      ok: false;
      reason: "permission" | "cancelled" | "invalid" | "failed";
      message?: string;
    };

export async function pickMenuImageFromLibrary(): Promise<PickMenuImageResult> {
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
      maxBytes: MENU_FILE_MAX_BYTES,
    });

    const menuAsset: MenuFileAsset = {
      uri: compressed.uri,
      name: asset.fileName?.replace(/\.\w+$/i, ".jpg") ?? "menu.jpg",
      mimeType: "image/jpeg",
      size: compressed.size,
    };

    const validationError = validateMenuFileAsset(menuAsset);
    if (validationError) {
      return { ok: false, reason: "invalid", message: validationError };
    }

    return { ok: true, asset: menuAsset };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
