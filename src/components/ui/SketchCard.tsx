import { DOODLE_TILT_MAX } from "@/src/constants/layout";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import {
  SKETCH_BORDER_LAYERS,
  STROKE_WIDTH,
  buildCardWobblyPath,
  seededOffset,
} from "@/src/lib/ui/sketchStroke";
import { useMemo, useState, type ReactNode } from "react";
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from "react-native";
import Svg, { Path } from "react-native-svg";

/** Extra padding so content clears the hand-drawn border stroke. */
export const SKETCH_CARD_BORDER_INSET = 6;

type Props = {
  children: ReactNode;
  seed?: number;
  style?: ViewStyle;
  padding?: number;
  /** Slight rotation in degrees for decorative cards only. */
  tilt?: number;
};

export function SketchCard({
  children,
  seed = 1,
  style,
  padding = 16,
  tilt = 0,
}: Props) {
  const { colors } = useOxTheme();
  const [size, setSize] = useState({ w: 0, h: 0 });

  const fillPath = useMemo(
    () => buildCardWobblyPath(size.w, size.h, seed),
    [size.w, size.h, seed],
  );
  const borderPaths = useMemo(
    () =>
      SKETCH_BORDER_LAYERS.map((layer) =>
        buildCardWobblyPath(size.w, size.h, seed + layer),
      ),
    [size.w, size.h, seed],
  );

  const effectiveTilt =
    tilt !== 0 ? tilt : seededOffset(seed, 99) * DOODLE_TILT_MAX;

  function onLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.w || height !== size.h) {
      setSize({ w: width, h: height });
    }
  }

  const contentPadding = padding + SKETCH_CARD_BORDER_INSET;

  return (
    <View
      style={[
        styles.wrap,
        style,
        effectiveTilt !== 0
          ? { transform: [{ rotate: `${effectiveTilt}deg` }] }
          : undefined,
      ]}
      onLayout={onLayout}
      collapsable={false}
    >
      {size.w > 0 && size.h > 0 && (
        <Svg
          width={size.w}
          height={size.h}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <Path d={fillPath} fill={colors.paper} />
          {borderPaths.map((d, i) => (
            <Path
              key={i}
              d={d}
              fill="none"
              stroke={colors.ink}
              strokeWidth={i === 0 ? STROKE_WIDTH : 1}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={i === 0 ? 1 : 0.75}
            />
          ))}
        </Svg>
      )}
      <View style={{ padding: contentPadding }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    overflow: "visible",
  },
});
