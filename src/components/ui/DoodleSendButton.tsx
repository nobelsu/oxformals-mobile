import { authElevation } from "@/src/components/auth/authStyles";
import { DoodleOutline } from "@/src/components/ui/DoodleOutline";
import { OxSpinner } from "@/src/components/ui/OxSpinner";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import {
  buildWobblySendPaths,
  STROKE_WIDTH,
} from "@/src/lib/ui/sketchStroke";
import { useMemo } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";

const DEFAULT_SIZE = 44;

type Props = {
  onPress: () => void;
  accessibilityLabel: string;
  seed?: number;
  size?: number;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

/** Sketch-styled send control — wobbly outline + hand-drawn paper plane. */
export function DoodleSendButton({
  onPress,
  accessibilityLabel,
  seed = 100,
  size = DEFAULT_SIZE,
  disabled = false,
  loading = false,
  style,
}: Props) {
  const { colors } = useOxTheme();
  const iconSize = Math.round(size * 0.48);
  const isDisabled = disabled || loading;
  const active = !isDisabled;

  const paths = useMemo(
    () => buildWobblySendPaths(iconSize, seed),
    [iconSize, seed],
  );

  const iconColor = active ? colors.accentInk : colors.inkMuted;
  const fill = active ? colors.accent : colors.paper;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      hitSlop={10}
      style={({ pressed }) => [
        active ? (authElevation(colors.ink) as ViewStyle) : undefined,
        {
          opacity: disabled && !loading ? 0.35 : pressed && active ? 0.9 : 1,
          transform: [{ scale: pressed && active ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      <DoodleOutline
        seed={seed}
        fill={fill}
        stroke={active ? colors.ink : colors.inkMuted}
        dashed={false}
        contentStyle={[styles.content, { width: size, height: size }]}
      >
        <View style={styles.iconWrap}>
          {loading ? (
            <OxSpinner size="sm" color={iconColor} />
          ) : (
            <Svg width={iconSize} height={iconSize}>
              <Path
                d={paths.plane}
                stroke={iconColor}
                strokeWidth={STROKE_WIDTH}
                strokeLinejoin="round"
                strokeLinecap="round"
                fill="none"
              />
              <Path
                d={paths.fold}
                stroke={iconColor}
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
                fill="none"
              />
            </Svg>
          )}
        </View>
      </DoodleOutline>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
