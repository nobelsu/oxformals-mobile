import {
  STROKE_DASH,
  STROKE_WIDTH,
  buildWobblyRectPath,
} from "@/src/lib/ui/sketchStroke";
import { useMemo, useState, type ReactNode } from "react";
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from "react-native";
import Svg, { Path } from "react-native-svg";

type Props = {
  children: ReactNode;
  seed?: number;
  fill?: string;
  stroke: string;
  dashed?: boolean;
  /** Thicker stroke — focus / emphasis. */
  focused?: boolean;
  /** Platform shadow on the wrapper. */
  elevated?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
};

/** Draws a hand-wobbly rect behind children sized via onLayout. */
export function DoodleOutline({
  children,
  seed = 1,
  fill = "transparent",
  stroke,
  dashed = true,
  focused = false,
  elevated = false,
  style,
  contentStyle,
}: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });

  const path = useMemo(
    () => buildWobblyRectPath(size.w, size.h, seed),
    [size.w, size.h, seed],
  );

  const strokeWidth = focused ? STROKE_WIDTH + 0.75 : STROKE_WIDTH;

  function onLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.w || height !== size.h) {
      setSize({ w: width, h: height });
    }
  }

  return (
    <View
      style={[
        styles.wrap,
        elevated ? styles.elevated : undefined,
        style,
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
          <Path
            d={path}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={dashed && !focused ? STROKE_DASH : undefined}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </Svg>
      )}
      <View style={contentStyle}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    overflow: "visible",
  },
  elevated: {
    overflow: "hidden",
  },
});
