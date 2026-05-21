import { InteractionManager, type RefObject } from "react-native";
import type { TextInput } from "react-native";

/** Focus a text field after animations (e.g. bottom sheet dismiss). */
export function focusInputAfter(
  ref: RefObject<TextInput | null>,
  delayMs = 320,
) {
  InteractionManager.runAfterInteractions(() => {
    setTimeout(() => {
      ref.current?.focus();
    }, delayMs);
  });
}

export function focusInputSoon(ref: RefObject<TextInput | null>) {
  requestAnimationFrame(() => {
    ref.current?.focus();
  });
}
