import { api } from "@/convex/_generated/api";
import { OxText } from "@/src/components/ui/OxText";
import { SketchCard } from "@/src/components/ui/SketchCard";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { StyleSheet, View } from "react-native";

/** Your spoons: what you can use, what's held and what's on the way. */
export function CreditsCard() {
  const { colors } = useOxTheme();
  const credits = useQuery(api.credits.getMyCredits, {});
  if (!credits) return null;

  const pending = [
    credits.spending > 0 ? `${credits.spending} held for formals you've booked` : null,
    credits.earning > 0 ? `${credits.earning} on the way from hosting` : null,
  ].filter(Boolean);

  return (
    <SketchCard seed={57} padding={14} tilt={0.001}>
      <View style={styles.row}>
        <MaterialCommunityIcons name="silverware-spoon" size={24} color={colors.ink} />
        <OxText style={[styles.balance, { color: colors.ink }]}>{credits.balance}</OxText>
        <OxText style={[styles.label, { color: colors.ink }]}>
          spoon{credits.balance === 1 ? "" : "s"} to use
        </OxText>
      </View>
      {pending.length > 0 ? (
        <OxText style={[styles.note, { color: colors.inkMuted }]}>
          {pending.join(" · ")}
        </OxText>
      ) : null}
    </SketchCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  balance: { fontSize: 34, lineHeight: 38 },
  label: { fontSize: 17 },
  note: { fontSize: 13, lineHeight: 18, marginTop: 6 },
});
