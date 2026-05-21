import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

const DEFAULT_HEIGHT = 32;

type Props = {
  edge: "top" | "bottom";
  color: string;
  height?: number;
};

export function ScrollEdgeFade({ edge, color, height = DEFAULT_HEIGHT }: Props) {
  const gradientId = `scrollEdgeFade-${edge}`;
  const isTop = edge === "top";

  return (
    <View
      style={[
        styles.overlay,
        isTop ? styles.top : styles.bottom,
        { height },
      ]}
      pointerEvents="none"
    >
      <Svg width="100%" height={height} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop
              offset="0"
              stopColor={color}
              stopOpacity={isTop ? "1" : "0"}
            />
            <Stop
              offset="1"
              stopColor={color}
              stopOpacity={isTop ? "0" : "1"}
            />
          </LinearGradient>
        </Defs>
        <Rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill={`url(#${gradientId})`}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 2,
  },
  top: {
    top: 0,
  },
  bottom: {
    bottom: 0,
  },
});
