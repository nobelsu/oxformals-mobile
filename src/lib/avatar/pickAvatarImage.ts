import { openPhotoLibrary } from "@/src/lib/media/openPhotoLibrary";

const MAX_DATA_URL_BYTES = 250 * 1024;

export type PickAvatarResult =
  | { ok: true; dataUrl: string }
  | { ok: false; reason: "permission" | "cancelled" | "too_large" | "failed" };

export async function pickAvatarImage(): Promise<PickAvatarResult> {
  const launch = await openPhotoLibrary({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
    base64: true,
  });

  if (!launch.ok) {
    return { ok: false, reason: launch.reason };
  }

  const { result } = launch;
  if (result.canceled || !result.assets[0]?.base64) {
    return { ok: false, reason: "cancelled" };
  }

  const asset = result.assets[0];
  const mime = asset.mimeType ?? "image/jpeg";
  const dataUrl = `data:${mime};base64,${asset.base64}`;

  if (dataUrl.length > MAX_DATA_URL_BYTES) {
    return { ok: false, reason: "too_large" };
  }

  return { ok: true, dataUrl };
}
