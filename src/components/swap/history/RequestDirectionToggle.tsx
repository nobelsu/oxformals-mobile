import type { RequestDirection } from "@/src/components/swap/history/constants";
import { DoodleOutline } from "@/src/components/ui/DoodleOutline";
import { DOODLE_TILT_MAX } from "@/src/constants/layout";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { seededOffset } from "@/src/lib/ui/sketchStroke";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const SEGMENTS: { value: RequestDirection; label: string }[] = [
  { value: "incoming", label: "Incoming" },
  { value: "outgoing", label: "Outgoing" },
];

const TRACK_SEED = 47;
const INDICATOR_SEED = 48;
const INDICATOR_TILT =
  seededOffset(INDICATOR_SEED, 3) * DOODLE_TILT_MAX * 2;

type Props = {
  value: RequestDirection;
  onChange: (direction: RequestDirection) => void;
};

function directionIndex(direction: RequestDirection): number {
  return direction === "incoming" ? 0 : 1;
}

export function RequestDirectionToggle({ value, onChange }: Props) {
  const { colors } = useOxTheme();
  const [segmentWidth, setSegmentWidth] = useState(0);
  const selectedIndex = useSharedValue(directionIndex(value));

  useEffect(() => {
    selectedIndex.value = withSpring(directionIndex(value), {
      damping: 14,
      stiffness: 110,
      mass: 0.85,
    });
  }, [value, selectedIndex]);

  const indicatorStyle = useAnimatedStyle(() => {
    const t = selectedIndex.value;
    const rotate = interpolate(t, [0, 0.5, 1], [0, INDICATOR_TILT, 0]);
    const scale = interpolate(t, [0, 0.5, 1], [1, 1.03, 1]);
    return {
      transform: [
        { translateX: t * segmentWidth },
        { rotate: `${rotate}deg` },
        { scale },
      ],
    };
  });

  function onLayout(e: { nativeEvent: { layout: { width: number } } }) {
    const width = e.nativeEvent.layout.width;
    const half = width / 2;
    if (half > 0 && half !== segmentWidth) {
      setSegmentWidth(half);
    }
  }

  function select(direction: RequestDirection) {
    if (direction === value) return;
    onChange(direction);
  }

  return (
    <DoodleOutline
      seed={TRACK_SEED}
      stroke={colors.ink}
      fill={colors.bg}
      dashed
      style={styles.root}
      contentStyle={styles.trackContent}
    >
      <View
        accessibilityRole="tablist"
        style={styles.row}
        onLayout={onLayout}
      >
        {segmentWidth > 0 ? (
          <Animated.View
            style={[
              styles.indicator,
              { width: segmentWidth },
              indicatorStyle,
            ]}
            pointerEvents="none"
          >
            <DoodleOutline
              seed={INDICATOR_SEED}
              fill={colors.accent}
              stroke={colors.accent}
              dashed={false}
              style={styles.indicatorDoodle}
            >
              <View style={styles.indicatorSpacer} />
            </DoodleOutline>
          </Animated.View>
        ) : null}
        {SEGMENTS.map((segment) => {
          const selected = value === segment.value;
          return (
            <Pressable
              key={segment.value}
              style={styles.segment}
              onPress={() => select(segment.value)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={segment.label}
            >
              <Text
                style={[
                  styles.label,
                  { color: selected ? colors.accentInk : colors.ink },
                ]}
              >
                {segment.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </DoodleOutline>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: "stretch",
    width: "100%",
    marginBottom: 12,
  },
  trackContent: {
    width: "100%",
    padding: 4,
  },
  row: {
    position: "relative",
    flexDirection: "row",
    width: "100%",
  },
  indicator: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 2,
    zIndex: 0,
  },
  indicatorDoodle: {
    flex: 1,
    height: "100%",
  },
  indicatorSpacer: {
    flex: 1,
    minHeight: 1,
  },
  segment: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  label: {
    fontSize: 15,
    fontFamily: FONT_DISPLAY,
  },
});
