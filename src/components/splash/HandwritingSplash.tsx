import { getOxColors } from "@/src/constants/oxTheme";
import { buildWavyLinePath } from "@/src/lib/ui/sketchStroke";
import { useEffect } from "react";
import { StyleSheet, useColorScheme, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { G, Path } from "react-native-svg";
import { OXFORMALS_GLYPHS } from "./oxformalsGlyphs";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedView = Animated.View;

const LETTER_MS = 340;
const STAGGER_MS = 165;
const HOLD_MS = 450;
const FADE_MS = 380;

const { viewBox, glyphs } = OXFORMALS_GLYPHS;
const VIEWBOX_STR = `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`;
const UNDERLINE_Y = viewBox.y + viewBox.h - 6;
const UNDERLINE_LEN = Math.round(viewBox.w * 0.72);

type Props = {
  onDone: () => void;
};

function AnimatedGlyph({
  d,
  length,
  stroke,
  delay,
}: {
  d: string;
  length: number;
  stroke: string;
  delay: number;
}) {
  const dashOffset = useSharedValue(length);
  const fillOpacity = useSharedValue(0);

  useEffect(() => {
    dashOffset.value = withDelay(
      delay,
      withTiming(0, {
        duration: LETTER_MS,
        easing: Easing.out(Easing.cubic),
      }),
    );
    fillOpacity.value = withDelay(
      delay + LETTER_MS * 0.55,
      withTiming(1, { duration: LETTER_MS * 0.45, easing: Easing.out(Easing.quad) }),
    );
  }, [dashOffset, delay, fillOpacity]);

  const strokeProps = useAnimatedProps(() => ({
    strokeDashoffset: dashOffset.value,
  }));

  const fillProps = useAnimatedProps(() => ({
    opacity: fillOpacity.value,
  }));

  return (
    <>
      <AnimatedPath
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${length} ${length}`}
        animatedProps={strokeProps}
      />
      <AnimatedPath d={d} fill={stroke} stroke="none" animatedProps={fillProps} />
    </>
  );
}

export function HandwritingSplash({ onDone }: Props) {
  const scheme = useColorScheme();
  const colorScheme = scheme === "dark" ? "dark" : "light";
  const colors = getOxColors("schoolbell", colorScheme);
  const { width: screenW } = useWindowDimensions();

  const overlayOpacity = useSharedValue(1);
  const underlineOffset = useSharedValue(UNDERLINE_LEN);

  const svgWidth = Math.min(screenW * 0.88, 340);
  const svgHeight = (svgWidth * viewBox.h) / viewBox.w;
  const underlineX = viewBox.x + (viewBox.w - UNDERLINE_LEN) / 2;
  const underlinePath = buildWavyLinePath(UNDERLINE_LEN, 7, UNDERLINE_Y);

  useEffect(() => {
    const lastLetterStart = (glyphs.length - 1) * STAGGER_MS;
    const underlineStart = lastLetterStart + LETTER_MS + 80;
    const totalBeforeFade = underlineStart + LETTER_MS + HOLD_MS;

    underlineOffset.value = withDelay(
      underlineStart,
      withTiming(0, {
        duration: LETTER_MS * 1.1,
        easing: Easing.out(Easing.cubic),
      }),
    );

    overlayOpacity.value = withDelay(
      totalBeforeFade,
      withSequence(
        withTiming(1, { duration: 0 }),
        withTiming(0, { duration: FADE_MS, easing: Easing.inOut(Easing.quad) }, (done) => {
          if (done) runOnJS(onDone)();
        }),
      ),
    );
  }, [onDone, overlayOpacity, underlineOffset]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const underlineProps = useAnimatedProps(() => ({
    strokeDashoffset: underlineOffset.value,
  }));

  return (
    <AnimatedView
      pointerEvents="none"
      style={[
        styles.overlay,
        { backgroundColor: colors.bg },
        overlayStyle,
      ]}
    >
      <View style={styles.center}>
        <Svg
          width={svgWidth}
          height={svgHeight}
          viewBox={VIEWBOX_STR}
          accessibilityLabel="oxformals"
        >
          {glyphs.map((glyph, index) => (
            <AnimatedGlyph
              key={`${glyph.ch}-${index}`}
              d={glyph.d}
              length={glyph.length}
              stroke={colors.ink}
              delay={index * STAGGER_MS}
            />
          ))}
          <G transform={`translate(${underlineX}, 0)`}>
            <AnimatedPath
              d={underlinePath}
              fill="none"
              stroke={colors.inkSoft}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeDasharray={`${UNDERLINE_LEN} ${UNDERLINE_LEN}`}
              animatedProps={underlineProps}
            />
          </G>
        </Svg>
      </View>
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 100,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
