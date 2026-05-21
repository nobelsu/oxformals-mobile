import { OxText } from "@/src/components/ui/OxText";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { StyleSheet, View } from "react-native";

type Props = {
  subdued?: boolean;
};

/** Split Swap | Pay badge for listings that accept either. */
export function DualTypeBadge({ subdued }: Props) {
  const { colors } = useOxTheme();

  return (
    <View
      style={[
        styles.root,
        { borderColor: colors.ink, opacity: subdued ? 0.55 : 1 },
      ]}
      accessibilityLabel="Swap or pay"
    >
      <View style={[styles.segment, { backgroundColor: colors.tag }]}>
        <OxText style={[styles.label, { color: colors.tagInk }]}>Swap</OxText>
      </View>
      <View style={[styles.divider, { backgroundColor: colors.ink }]} />
      <View style={[styles.segment, { backgroundColor: colors.accent }]}>
        <OxText style={[styles.label, { color: colors.accentInk }]}>Pay</OxText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "stretch",
    alignSelf: "flex-start",
    borderWidth: 2,
    borderRadius: 999,
    overflow: "hidden",
  },
  segment: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    justifyContent: "center",
  },
  divider: { width: 2 },
  label: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
