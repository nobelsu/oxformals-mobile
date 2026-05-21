import { openPhotoLibrary } from "@/src/lib/media/openPhotoLibrary";

import {
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
  if (result.canceled || !result.assets[0]) {
    return { ok: false, reason: "cancelled" };
  }

  const asset = result.assets[0];
  const menuAsset: MenuFileAsset = {
    uri: asset.uri,
    name: asset.fileName ?? "menu.jpg",
    mimeType: asset.mimeType ?? "image/jpeg",
    size: asset.fileSize ?? 0,
  };

  const validationError = validateMenuFileAsset(menuAsset);
  if (validationError) {
    return { ok: false, reason: "invalid", message: validationError };
  }

  if (!menuAsset.uri) {
    return { ok: false, reason: "failed" };
  }

  return { ok: true, asset: menuAsset };
}
