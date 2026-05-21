import * as ImagePicker from "expo-image-picker";
import { InteractionManager } from "react-native";

export type OpenPhotoLibraryResult =
  | { ok: true; result: ImagePicker.ImagePickerResult }
  | { ok: false; reason: "permission" | "failed" };

export type PhotoLibraryOptions = ImagePicker.ImagePickerOptions;

/** Run after modals/alerts finish dismissing so the picker can present safely. */
export function runAfterUIReady(fn: () => void): void {
  InteractionManager.runAfterInteractions(() => {
    requestAnimationFrame(() => {
      fn();
    });
  });
}

export async function requestPhotoLibraryPermission(): Promise<boolean> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return perm.granted;
}

export async function openPhotoLibrary(
  options: PhotoLibraryOptions,
): Promise<OpenPhotoLibraryResult> {
  const granted = await requestPhotoLibraryPermission();
  if (!granted) {
    return { ok: false, reason: "permission" };
  }

  try {
    const result = await ImagePicker.launchImageLibraryAsync(options);
    return { ok: true, result };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
