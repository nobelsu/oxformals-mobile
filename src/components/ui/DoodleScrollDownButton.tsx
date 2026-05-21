import { DoodleOutline } from "@/src/components/ui/DoodleOutline";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import {
  buildWobblyChevronDownPaths,
  buildWobblyChevronUpPaths,
  STROKE_WIDTH,
} from "@/src/lib/ui/sketchStroke";
import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

const DEFAULT_SIZE = 44;

type Props = {
  onPress: () => void;
  accessibilityLabel: string;
  direction?: "up" | "down";
  seed?: number;
  size?: number;
  disabled?: boolean;
};

/** Sketch-styled scroll chevron — wobbly outline + hand-drawn chevron. */
export function DoodleScrollDownButton({
  onPress,
  accessibilityLabel,
  direction = "down",
  seed = 12,
  size = DEFAULT_SIZE,
  disabled = false,
}: Props) {
  const { colors } = useOxTheme();
  const iconSize = Math.round(size * 0.5);

  const paths = useMemo(
    () =>
      direction === "up"
        ? buildWobblyChevronUpPaths(iconSize, seed)
        : buildWobblyChevronDownPaths(iconSize, seed),
    [direction, iconSize, seed],
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={10}
      style={({ pressed }) => [
        {
          opacity: disabled ? 0.3 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
        },
      ]}
    >
      <DoodleOutline
        seed={seed}
        fill={colors.paper}
        stroke={colors.ink}
        dashed
        elevated
        contentStyle={[styles.content, { width: size, height: size }]}
      >
        <View style={styles.iconWrap}>
          <Svg width={iconSize} height={iconSize}>
            <Path
              d={paths.left}
              stroke={colors.ink}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d={paths.right}
              stroke={colors.ink}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              fill="none"
            />
          </Svg>
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
