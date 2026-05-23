import { DoodleOutline } from "@/src/components/ui/DoodleOutline";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import {
  buildWobblyXPaths,
  STROKE_WIDTH,
} from "@/src/lib/ui/sketchStroke";
import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

const DEFAULT_SIZE = 32;

type Props = {
  onPress: () => void;
  accessibilityLabel: string;
  seed?: number;
  size?: number;
  disabled?: boolean;
  variant?: "outlined" | "iconOnly";
};

function CloseIcon({
  iconSize,
  seed,
  stroke,
}: {
  iconSize: number;
  seed: number;
  stroke: string;
}) {
  const paths = useMemo(
    () => buildWobblyXPaths(iconSize, seed),
    [iconSize, seed],
  );

  return (
    <Svg width={iconSize} height={iconSize}>
      <Path
        d={paths.nwSe}
        stroke={stroke}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d={paths.neSw}
        stroke={stroke}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

/** Sketch-styled close control — wobbly outline or icon-only hand-drawn X. */
export function DoodleCloseButton({
  onPress,
  accessibilityLabel,
  seed = 13,
  size = DEFAULT_SIZE,
  disabled = false,
  variant = "outlined",
}: Props) {
  const { colors } = useOxTheme();
  const iconSize = Math.round(size * (variant === "iconOnly" ? 1 : 0.5));

  const pressableStyle = ({ pressed }: { pressed: boolean }) => [
    {
      opacity: disabled ? 0.3 : pressed ? 0.85 : 1,
      transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
    },
  ];

  const icon = (
    <View style={styles.iconWrap}>
      <CloseIcon iconSize={iconSize} seed={seed} stroke={colors.ink} />
    </View>
  );

  if (variant === "iconOnly") {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        hitSlop={8}
        style={pressableStyle}
      >
        {icon}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={10}
      style={pressableStyle}
    >
      <DoodleOutline
        seed={seed}
        fill={colors.paper}
        stroke={colors.ink}
        contentStyle={{ ...styles.content, width: size, height: size }}
      >
        {icon}
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
