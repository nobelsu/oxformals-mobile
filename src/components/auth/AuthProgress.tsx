import { FONT_DISPLAY } from "@/src/constants/fonts";
import { space, TAP_MIN } from "@/src/constants/spacing";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { seededOffset, STROKE_DASH, STROKE_WIDTH } from "@/src/lib/ui/sketchStroke";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

export type AuthStep = "email" | "code" | "profile";

const STEPS: { id: AuthStep; label: string }[] = [
  { id: "email", label: "Email" },
  { id: "code", label: "Code" },
  { id: "profile", label: "Profile" },
];

type Props = {
  current: AuthStep;
  onStepPress?: (step: AuthStep) => void;
};

export function AuthProgress({ current, onStepPress }: Props) {
  const { colors } = useOxTheme();
  const activeIndex = STEPS.findIndex((s) => s.id === current);

  return (
    <View style={styles.wrap} accessibilityRole="progressbar">
      <View
        style={[styles.track, { backgroundColor: colors.ink }]}
        accessibilityElementsHidden
      />
      <View style={styles.row}>
        {STEPS.map((step, i) => {
          const active = i === activeIndex;
          const done = i < activeIndex;
          const reachable = done && onStepPress != null;
          const cx = 11 + seededOffset(i, 0) * 0.8;
          const cy = 11 + seededOffset(i, 1) * 0.8;

          const node = (
            <View style={styles.step}>
              <View style={styles.dotWrap}>
                <Svg width={22} height={22}>
                  <Circle
                    cx={cx}
                    cy={cy}
                    r={active ? 8 : 7}
                    fill={
                      active || done ? colors.accent : colors.paper
                    }
                    stroke={colors.ink}
                    strokeWidth={STROKE_WIDTH}
                    strokeDasharray={active || done ? undefined : STROKE_DASH}
                  />
                </Svg>
                <Text
                  style={[
                    styles.stepNum,
                    {
                      color: active || done ? colors.accentInk : colors.inkSoft,
                      fontFamily: FONT_DISPLAY,
                    },
                  ]}
                >
                  {done ? "✓" : i + 1}
                </Text>
              </View>
              <Text
                style={[
                  styles.label,
                  {
                    color: active
                      ? colors.ink
                      : done
                        ? colors.inkMuted
                        : colors.inkSoft,
                    fontFamily: FONT_DISPLAY,
                  },
                ]}
              >
                {step.label}
              </Text>
            </View>
          );

          return (
            <View key={step.id} style={styles.stepCol}>
              {reachable ? (
                <Pressable
                  onPress={() => onStepPress(step.id)}
                  style={styles.stepPress}
                  accessibilityRole="button"
                  accessibilityLabel={`Back to ${step.label}`}
                  accessibilityState={{ selected: active }}
                >
                  {node}
                </Pressable>
              ) : (
                node
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    maxWidth: 280,
    alignSelf: "center",
    minHeight: TAP_MIN,
    justifyContent: "center",
  },
  track: {
    position: "absolute",
    left: space[6],
    right: space[6],
    top: 10,
    height: 2,
    opacity: 0.1,
    borderRadius: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stepCol: {
    flex: 1,
    alignItems: "center",
  },
  stepPress: {
    alignItems: "center",
    minWidth: TAP_MIN,
    minHeight: TAP_MIN,
    justifyContent: "center",
  },
  step: {
    alignItems: "center",
    gap: space[1],
  },
  dotWrap: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNum: {
    position: "absolute",
    fontSize: 11,
    lineHeight: 14,
    textAlign: "center",
    width: 22,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
});
