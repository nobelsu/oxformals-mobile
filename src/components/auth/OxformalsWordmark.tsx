import { OXFORMALS_GLYPHS } from "@/src/components/splash/oxformalsGlyphs";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { buildWavyLinePath } from "@/src/lib/ui/sketchStroke";
import { StyleSheet, View } from "react-native";
import Svg, { G, Path } from "react-native-svg";

const { viewBox, glyphs } = OXFORMALS_GLYPHS;
const VIEWBOX_STR = `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`;
const UNDERLINE_Y = viewBox.y + viewBox.h - 6;
const UNDERLINE_LEN = Math.round(viewBox.w * 0.72);

type Props = {
  width?: number;
};

export function OxformalsWordmark({ width = 200 }: Props) {
  const { colors } = useOxTheme();
  const height = (width * viewBox.h) / viewBox.w;
  const underlineX = viewBox.x + (viewBox.w - UNDERLINE_LEN) / 2;

  return (
    <View style={styles.wrap}>
      <Svg width={width} height={height} viewBox={VIEWBOX_STR}>
        <G fill={colors.ink}>
          {glyphs.map((g, i) => (
            <Path key={i} d={g.d} />
          ))}
        </G>
        <G transform={`translate(${underlineX}, 0)`}>
          <Path
            d={buildWavyLinePath(UNDERLINE_LEN, 7, UNDERLINE_Y)}
            fill="none"
            stroke={colors.inkSoft}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
  },
});
