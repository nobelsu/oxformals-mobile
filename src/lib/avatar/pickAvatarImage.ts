import { compressImage } from "@/src/lib/media/compressImage";
import { openPhotoLibrary } from "@/src/lib/media/openPhotoLibrary";

const MAX_DATA_URL_BYTES = 900 * 1024;

export type PickAvatarResult =
  | { ok: true; dataUrl: string }
  | { ok: false; reason: "permission" | "cancelled" | "too_large" | "failed" };

export async function pickAvatarImage(): Promise<PickAvatarResult> {
  const launch = await openPhotoLibrary({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
    base64: false,
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
      maxWidth: 512,
      quality: 0.75,
      base64: true,
      maxBytes: MAX_DATA_URL_BYTES,
    });

    if (!compressed.base64) {
      return { ok: false, reason: "failed" };
    }

    const dataUrl = `data:image/jpeg;base64,${compressed.base64}`;

    if (dataUrl.length > MAX_DATA_URL_BYTES) {
      return { ok: false, reason: "too_large" };
    }

    return { ok: true, dataUrl };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
