import { useOxTheme } from "@/src/contexts/ThemeContext";
import {
  buildWobblyExchangePaths,
  STROKE_WIDTH,
} from "@/src/lib/ui/sketchStroke";
import { useMemo } from "react";
import { View, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";

const DEFAULT_SIZE = 28;

type Props = {
  size?: number;
  seed?: number;
  style?: ViewStyle;
};

export function DoodleExchangeIcon({
  size = DEFAULT_SIZE,
  seed = 7,
  style,
}: Props) {
  const { colors } = useOxTheme();
  const paths = useMemo(
    () => buildWobblyExchangePaths(size, seed),
    [size, seed],
  );
  const stroke = colors.ink;

  return (
    <View
      style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={size} height={size} pointerEvents="none">
        <Path
          d={paths.top}
          stroke={stroke}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d={paths.topHead}
          stroke={stroke}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d={paths.bottom}
          stroke={stroke}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d={paths.bottomHead}
          stroke={stroke}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}
