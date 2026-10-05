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
import Svg, { G, Path } from "react-native-svg";

/** Extra padding so content clears the hand-drawn border stroke. */
export const SKETCH_CARD_BORDER_INSET = 6;

/** Room around the box so the wobbling outline is never cut off at the edge. */
const BLEED = 8;
/** Short rows get a calmer outline; a full wobble on them reads as a glitch. */
const SHORT_CARD_HEIGHT = 110;
const SHORT_CARD_AMPLITUDE = 2;
/** Two strokes a few points apart: hand-drawn, without looking like a misprint. */
const CARD_AMPLITUDE = 3;

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

  const short = size.h < SHORT_CARD_HEIGHT;
  const amplitude = short ? SHORT_CARD_AMPLITUDE : CARD_AMPLITUDE;
  const fillPath = useMemo(
    () => buildCardWobblyPath(size.w, size.h, seed, 2, amplitude),
    [size.w, size.h, seed, amplitude],
  );
  const borderPaths = useMemo(
    () =>
      SKETCH_BORDER_LAYERS.slice(0, 2).map((layer) =>
        buildCardWobblyPath(size.w, size.h, seed + layer, 2, amplitude),
      ),
    [size.w, size.h, seed, amplitude],
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
          width={size.w + BLEED * 2}
          height={size.h + BLEED * 2}
          style={styles.outline}
          pointerEvents="none"
        >
          <G x={BLEED} y={BLEED}>
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
                opacity={i === 0 ? 1 : 0.55}
              />
            ))}
          </G>
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
  outline: { position: "absolute", left: -BLEED, top: -BLEED },
});
