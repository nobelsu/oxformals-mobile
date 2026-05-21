import { useOxTheme } from "@/src/contexts/ThemeContext";
import {
  buildWobblyCalendarPaths,
  STROKE_WIDTH,
} from "@/src/lib/ui/sketchStroke";
import { useMemo } from "react";
import { View, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";

const DEFAULT_SIZE = 20;

type Props = {
  size?: number;
  seed?: number;
  color?: string;
  style?: ViewStyle;
};

export function DoodleCalendarIcon({
  size = DEFAULT_SIZE,
  seed = 19,
  color,
  style,
}: Props) {
  const { colors } = useOxTheme();
  const stroke = color ?? colors.ink;
  const paths = useMemo(
    () => buildWobblyCalendarPaths(size, seed),
    [size, seed],
  );

  const strokeProps = {
    stroke,
    strokeWidth: STROKE_WIDTH,
    strokeLinecap: "round" as const,
    fill: "none" as const,
  };

  return (
    <View
      style={[
        { width: size, height: size, alignItems: "center", justifyContent: "center" },
        style,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={size} height={size} pointerEvents="none">
        <Path d={paths.body} {...strokeProps} />
        <Path d={paths.ringLeft} {...strokeProps} />
        <Path d={paths.ringRight} {...strokeProps} />
        <Path d={paths.divider} {...strokeProps} />
      </Svg>
    </View>
  );
}
