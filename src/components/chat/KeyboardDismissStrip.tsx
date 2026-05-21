import { useCallback, useMemo, type ReactNode } from "react";
import { Keyboard, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";

const DISMISS_THRESHOLD_PX = 24;
const ACTIVE_OFFSET_Y_PX = 10;
const FAIL_OFFSET_X_PX = 12;

function useKeyboardDismissPan(enabled: boolean) {
  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  return useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled)
        .activeOffsetY(ACTIVE_OFFSET_Y_PX)
        .failOffsetX([-FAIL_OFFSET_X_PX, FAIL_OFFSET_X_PX])
        .onEnd((e) => {
          if (e.translationY >= DISMISS_THRESHOLD_PX) {
            runOnJS(dismissKeyboard)();
          }
        }),
    [dismissKeyboard, enabled],
  );
}

type StripProps = {
  enabled: boolean;
};

/** Transparent hit target for downward swipe to dismiss the keyboard. */
export function KeyboardDismissStrip({ enabled }: StripProps) {
  const pan = useKeyboardDismissPan(enabled);

  if (!enabled) {
    return null;
  }

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.strip} accessibilityElementsHidden />
    </GestureDetector>
  );
}

type PanAreaProps = {
  enabled: boolean;
  children: ReactNode;
};

/** Wraps composer chrome (reply banner, etc.) for the same downward-dismiss gesture. */
export function KeyboardDismissPanArea({ enabled, children }: PanAreaProps) {
  const pan = useKeyboardDismissPan(enabled);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <GestureDetector gesture={pan}>
      <View collapsable={false}>{children}</View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  strip: {
    height: 36,
    width: "100%",
  },
});
