import { OxText } from "@/src/components/ui/OxText";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import type { FormalType } from "@/src/lib/data/types";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

export const FORMAL_TYPE_LABELS: Record<FormalType, string> = {
  matchmaking: "Matchmaking",
  social: "Social",
  networking: "Networking",
};

const ICONS: Record<FormalType, keyof typeof Ionicons.glyphMap> = {
  matchmaking: "heart-outline",
  social: "people-outline",
  networking: "briefcase-outline",
};

type Props = {
  formalType: FormalType;
};

/** Quiet icon + label ("Social") for a listing's meta line. */
export function FormalTypeTag({ formalType }: Props) {
  const { colors } = useOxTheme();
  const label = FORMAL_TYPE_LABELS[formalType];

  return (
    <View style={styles.wrap} accessible accessibilityLabel={label}>
      <Ionicons name={ICONS[formalType]} size={14} color={colors.inkMuted} />
      <OxText style={[styles.label, { color: colors.inkMuted }]}>{label}</OxText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 4 },
  label: { fontSize: 13 },
});
