import { DoodleOutline } from "@/src/components/ui/DoodleOutline";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import {
  buildWobblyPlusPaths,
  STROKE_WIDTH,
} from "@/src/lib/ui/sketchStroke";
import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

const DEFAULT_SIZE = 44;

type Props = {
  onPress: () => void;
  accessibilityLabel: string;
  seed?: number;
  size?: number;
  disabled?: boolean;
};

/** Sketch-styled add control — wobbly outline + centered hand-drawn plus. */
export function DoodleAddButton({
  onPress,
  accessibilityLabel,
  seed = 12,
  size = DEFAULT_SIZE,
  disabled = false,
}: Props) {
  const { colors } = useOxTheme();
  const iconSize = Math.round(size * 0.5);

  const paths = useMemo(
    () => buildWobblyPlusPaths(iconSize, seed),
    [iconSize, seed],
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
        contentStyle={[styles.content, { width: size, height: size }]}
      >
        <View style={styles.iconWrap}>
          <Svg width={iconSize} height={iconSize}>
            <Path
              d={paths.horizontal}
              stroke={colors.ink}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d={paths.vertical}
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
