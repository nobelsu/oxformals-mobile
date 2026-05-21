import { useOxTheme } from "@/src/contexts/ThemeContext";
import {
  buildWobblyRectPath,
  STROKE_DASH,
  STROKE_WIDTH,
} from "@/src/lib/ui/sketchStroke";
import { useEffect, useMemo } from "react";
import { StyleSheet, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

const SPIN_MS = 900;

const SIZES = {
  sm: 18,
  md: 28,
  lg: 40,
} as const;

type Size = keyof typeof SIZES;

type Props = {
  size?: Size;
  color?: string;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

export function OxSpinner({
  size = "md",
  color: colorProp,
  style,
  accessibilityLabel = "Loading",
}: Props) {
  const { colors } = useOxTheme();
  const color = colorProp ?? colors.ink;
  const dim = SIZES[size];
  const rotation = useSharedValue(0);

  const path = useMemo(
    () => buildWobblyRectPath(dim, dim, 3, 2),
    [dim],
  );

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: SPIN_MS,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
  }, [rotation]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View
      style={[styles.wrap, { width: dim, height: dim }, spinStyle, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
    >
      <Svg width={dim} height={dim}>
        <Path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={STROKE_DASH}
        />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
