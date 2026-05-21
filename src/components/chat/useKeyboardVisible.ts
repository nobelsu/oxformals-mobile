import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

export type KeyboardMetrics = {
  visible: boolean;
  height: number;
};

export function useKeyboardMetrics(): KeyboardMetrics {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return { visible: height > 0, height };
}

export function useKeyboardVisible(): boolean {
  return useKeyboardMetrics().visible;
}
