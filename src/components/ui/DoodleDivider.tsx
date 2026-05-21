import { useOxTheme } from "@/src/contexts/ThemeContext";
import { buildWavyLinePath, STROKE_WIDTH } from "@/src/lib/ui/sketchStroke";
import { useMemo, useState } from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";

type Props = {
  seed?: number;
  marginVertical?: number;
};

export function DoodleDivider({ seed = 42, marginVertical = 12 }: Props) {
  const { colors } = useOxTheme();
  const [width, setWidth] = useState(0);

  const path = useMemo(
    () => buildWavyLinePath(width, seed),
    [width, seed],
  );

  return (
    <View
      style={{ marginVertical, height: 14 }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 && (
        <Svg width={width} height={14} pointerEvents="none">
          <Path
            d={path}
            fill="none"
            stroke={colors.ink}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            opacity={0.55}
          />
        </Svg>
      )}
    </View>
  );
}
