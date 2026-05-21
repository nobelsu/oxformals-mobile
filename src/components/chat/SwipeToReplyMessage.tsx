import { useOxTheme } from "@/src/contexts/ThemeContext";
import { lightImpact } from "@/src/lib/haptics";
import { useCallback, useEffect, type ReactNode } from "react";
import { Keyboard, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import Svg, { Path, Polyline } from "react-native-svg";

const SWIPE_THRESHOLD_PX = 56;
const MAX_SWIPE_PX = 72;
const LOCK_THRESHOLD_PX = 10;
const KEYBOARD_DISMISS_THRESHOLD_PX = 24;

type Props = {
  onReply: () => void;
  keyboardVisible?: boolean;
  children: ReactNode;
};

export function SwipeToReplyMessage({
  onReply,
  keyboardVisible = false,
  children,
}: Props) {
  const { colors } = useOxTheme();
  const offsetX = useSharedValue(0);
  const locked = useSharedValue<0 | 1 | 2>(0); // 0 = undecided, 1 = horizontal, 2 = vertical
  const keyboardOpen = useSharedValue(0);

  useEffect(() => {
    keyboardOpen.value = keyboardVisible ? 1 : 0;
  }, [keyboardVisible, keyboardOpen]);

  const triggerReply = useCallback(() => {
    onReply();
    lightImpact();
  }, [onReply]);

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  const pan = Gesture.Pan()
    .activeOffsetX(LOCK_THRESHOLD_PX)
    .failOffsetY([-LOCK_THRESHOLD_PX, LOCK_THRESHOLD_PX])
    .onBegin(() => {
      locked.value = 0;
    })
    .onUpdate((e) => {
      if (locked.value === 2) return;

      const dx = e.translationX;
      const dy = e.translationY;

      if (locked.value === 0) {
        if (
          Math.abs(dx) < LOCK_THRESHOLD_PX &&
          Math.abs(dy) < LOCK_THRESHOLD_PX
        ) {
          return;
        }
        if (Math.abs(dy) > Math.abs(dx)) {
          locked.value = 2;
          return;
        }
        locked.value = 1;
      }

      if (locked.value !== 1) return;

      offsetX.value = Math.min(Math.max(0, dx), MAX_SWIPE_PX);
    })
    .onEnd((e) => {
      const wasVertical = locked.value === 2;
      if (
        wasVertical &&
        keyboardOpen.value === 1 &&
        e.translationY >= KEYBOARD_DISMISS_THRESHOLD_PX
      ) {
        runOnJS(dismissKeyboard)();
      } else if (offsetX.value >= SWIPE_THRESHOLD_PX) {
        runOnJS(triggerReply)();
      }
      offsetX.value = withSpring(0, { damping: 20, stiffness: 300 });
      locked.value = 0;
    })
    .onFinalize(() => {
      offsetX.value = withSpring(0, { damping: 20, stiffness: 300 });
      locked.value = 0;
    });

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offsetX.value }],
  }));

  const iconStyle = useAnimatedStyle(() => {
    const progress = Math.min(1, offsetX.value / SWIPE_THRESHOLD_PX);
    const scale = 0.65 + progress * 0.35;
    return {
      opacity: progress,
      transform: [{ scale }],
    };
  });

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.iconWrap, iconStyle]} pointerEvents="none">
        <Svg width={20} height={20} viewBox="0 0 24 24">
          <Polyline
            points="9 14 4 9 9 4"
            fill="none"
            stroke={colors.inkSoft}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M20 20v-7a4 4 0 0 0-4-4H4"
            fill="none"
            stroke={colors.inkSoft}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={contentStyle}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "relative",
  },
  iconWrap: {
    position: "absolute",
    left: 0,
    top: "50%",
    marginTop: -16,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
