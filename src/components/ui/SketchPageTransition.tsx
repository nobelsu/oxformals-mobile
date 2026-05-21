import { DOODLE_TILT_MAX } from "@/src/constants/layout";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import {
  buildWavyLinePath,
  seededOffset,
  STROKE_WIDTH,
} from "@/src/lib/ui/sketchStroke";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

const AnimatedPath = Animated.createAnimatedComponent(Path);

const EXIT_MS = 200;
const SCRIBBLE_MS = 380;
const FADE_IN_MS = 360;
const UNDERLINE_INSET = 12;

type Props = {
  /** Changes trigger the handwriting transition. */
  pageKey: string;
  seed: number;
  /** 1 = forward, -1 = backward (affects exit tilt). */
  direction?: 1 | -1;
  children: ReactNode;
};

export function SketchPageTransition({
  pageKey,
  seed,
  direction = 1,
  children,
}: Props) {
  const { colors } = useOxTheme();
  const [contentWidth, setContentWidth] = useState(0);
  const isFirstMount = useRef(true);

  const contentOpacity = useSharedValue(1);
  const contentScale = useSharedValue(1);
  const contentRotate = useSharedValue(0);
  const underlineOffset = useSharedValue(0);
  const underlineOpacity = useSharedValue(0);

  const underlineWidth = Math.max(0, contentWidth - UNDERLINE_INSET * 2);
  const underlineLength = underlineWidth;
  const exitTilt =
    seededOffset(seed, 7) * DOODLE_TILT_MAX * 2.5 * direction;

  const underlinePath = useMemo(
    () => buildWavyLinePath(underlineWidth, seed + 13, 6),
    [underlineWidth, seed],
  );

  useEffect(() => {
    if (underlineLength <= 0) return;

    const runEnter = () => {
      underlineOpacity.value = withTiming(1, { duration: 80 });
      underlineOffset.value = underlineLength;
      underlineOffset.value = withTiming(0, {
        duration: SCRIBBLE_MS,
        easing: Easing.out(Easing.cubic),
      });
      contentOpacity.value = withDelay(
        60,
        withTiming(1, {
          duration: FADE_IN_MS,
          easing: Easing.out(Easing.quad),
        }),
      );
      contentScale.value = withDelay(
        60,
        withTiming(1, {
          duration: FADE_IN_MS,
          easing: Easing.out(Easing.cubic),
        }),
      );
      contentRotate.value = withDelay(
        60,
        withTiming(0, {
          duration: FADE_IN_MS,
          easing: Easing.out(Easing.cubic),
        }),
      );
    };

    if (isFirstMount.current) {
      isFirstMount.current = false;
      contentOpacity.value = 0;
      contentScale.value = 0.97;
      contentRotate.value = exitTilt * 0.5;
      runEnter();
      return;
    }

    contentOpacity.value = withTiming(0, {
      duration: EXIT_MS,
      easing: Easing.in(Easing.quad),
    });
    contentScale.value = withTiming(0.96, {
      duration: EXIT_MS,
      easing: Easing.in(Easing.quad),
    });
    contentRotate.value = withTiming(exitTilt, {
      duration: EXIT_MS,
      easing: Easing.in(Easing.quad),
    });
    underlineOpacity.value = withTiming(0, { duration: EXIT_MS * 0.6 });

    contentOpacity.value = withDelay(EXIT_MS, withTiming(0, { duration: 0 }));
    contentScale.value = withDelay(EXIT_MS, withTiming(0.97, { duration: 0 }));
    contentRotate.value = withDelay(
      EXIT_MS,
      withTiming(exitTilt * -0.4, { duration: 0 }),
    );

    underlineOffset.value = withDelay(
      EXIT_MS,
      withSequence(
        withTiming(underlineLength, { duration: 0 }),
        withTiming(0, {
          duration: SCRIBBLE_MS,
          easing: Easing.out(Easing.cubic),
        }),
      ),
    );
    underlineOpacity.value = withDelay(
      EXIT_MS,
      withTiming(1, { duration: 100 }),
    );

    contentOpacity.value = withDelay(
      EXIT_MS + 60,
      withTiming(1, {
        duration: FADE_IN_MS,
        easing: Easing.out(Easing.quad),
      }),
    );
    contentScale.value = withDelay(
      EXIT_MS + 60,
      withTiming(1, {
        duration: FADE_IN_MS,
        easing: Easing.out(Easing.cubic),
      }),
    );
    contentRotate.value = withDelay(
      EXIT_MS + 60,
      withTiming(0, {
        duration: FADE_IN_MS,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [
    pageKey,
    underlineLength,
    exitTilt,
    contentOpacity,
    contentScale,
    contentRotate,
    underlineOffset,
    underlineOpacity,
  ]);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [
      { scale: contentScale.value },
      { rotate: `${contentRotate.value}deg` },
    ],
  }));

  const underlineProps = useAnimatedProps(() => ({
    strokeDashoffset: underlineOffset.value,
    opacity: underlineOpacity.value,
  }));

  function onLayout(e: LayoutChangeEvent) {
    const { width } = e.nativeEvent.layout;
    if (width > 0 && width !== contentWidth) {
      setContentWidth(width);
    }
  }

  return (
    <View style={styles.root} onLayout={onLayout}>
      <Animated.View style={[styles.content, contentStyle]}>{children}</Animated.View>
      {underlineWidth > 0 ? (
        <View style={styles.underlineWrap} pointerEvents="none">
          <Svg
            width={underlineWidth}
            height={14}
            style={{ marginLeft: UNDERLINE_INSET }}
          >
            <AnimatedPath
              d={underlinePath}
              fill="none"
              stroke={colors.inkSoft}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              strokeDasharray={`${underlineLength} ${underlineLength}`}
              animatedProps={underlineProps}
            />
          </Svg>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: "100%" },
  content: { width: "100%" },
  underlineWrap: {
    marginTop: 8,
    height: 14,
    width: "100%",
  },
});
