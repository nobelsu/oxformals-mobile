import { DoodleCalendarIcon } from "@/src/components/ui/DoodleCalendarIcon";
import { DoodleOutline } from "@/src/components/ui/DoodleOutline";
import { TAP_MIN } from "@/src/constants/spacing";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { Pressable, StyleSheet, View } from "react-native";

type Props = {
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityState?: { expanded?: boolean };
  seed?: number;
  size?: number;
  disabled?: boolean;
  showBadge?: boolean;
  pointerEvents?: "auto" | "none" | "box-none" | "box-only";
};

/** Sketch-styled calendar control — wobbly outline + hand-drawn calendar icon. */
export function DoodleCalendarButton({
  onPress,
  accessibilityLabel,
  accessibilityState,
  seed = 19,
  size = TAP_MIN,
  disabled = false,
  showBadge = false,
  pointerEvents,
}: Props) {
  const { colors } = useOxTheme();
  const iconSize = Math.round(size * 0.5);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      pointerEvents={pointerEvents}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      hitSlop={10}
      style={({ pressed }) => [
        {
          opacity: disabled ? 0.3 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
        },
      ]}
    >
      <DoodleOutline
        seed={seed}
        fill={colors.paper}
        stroke={colors.ink}
        contentStyle={[styles.content, { width: size, height: size }]}
      >
        <View style={styles.iconWrap}>
          <DoodleCalendarIcon size={iconSize} seed={seed} color={colors.ink} />
          {showBadge ? (
            <View style={[styles.badge, { backgroundColor: colors.accent }]} />
          ) : null}
        </View>
      </DoodleOutline>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    right: -4,
    top: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
