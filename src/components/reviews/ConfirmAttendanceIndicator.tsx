import { useOxTheme } from "@/src/contexts/ThemeContext";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  style?: object;
};

export function ConfirmAttendanceIndicator({ style }: Props) {
  const { colors } = useOxTheme();

  return (
    <View style={[styles.root, style]} accessibilityElementsHidden>
      <View style={[styles.badge, { borderColor: colors.accentHover }]}>
        <Text style={[styles.check, { color: colors.accentHover }]}>✓</Text>
      </View>
      <Text style={[styles.label, { color: colors.accentHover }]}>
        Confirm attendance
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  badge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  check: { fontSize: 10, fontWeight: "700", lineHeight: 12 },
  label: { fontSize: 12, fontWeight: "500" },
});
