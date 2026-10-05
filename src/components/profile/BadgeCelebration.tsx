import { api } from "@/convex/_generated/api";
import { badgeById, type BadgeDefinition } from "@/lib/data/badges";
import { useAuth } from "@/src/components/auth/useAuth";
import { BadgeMedal } from "@/src/components/profile/BadgeMedal";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxModal } from "@/src/components/ui/OxModal";
import { OxText } from "@/src/components/ui/OxText";
import { space } from "@/src/constants/spacing";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

/**
 * Names badges as they're earned, then marks them seen so each shows once
 * (across devices). Badges earned in the same moment share one sheet, since
 * the seen line moves past all of them together.
 */
export function BadgeCelebration() {
  const { colors } = useOxTheme();
  const { user, isAuthenticated, needsRulesAgreement } = useAuth();
  const active = isAuthenticated && !!user && !needsRulesAgreement;
  const newBadges = useQuery(api.badges.getMyNewBadges, active ? {} : "skip");
  const markSeen = useMutation(api.badges.markBadgesSeen);
  const baselineSet = useRef(false);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);

  // First run since badges existed: don't replay every badge ever earned.
  useEffect(() => {
    if (newBadges?.needsBaseline && !baselineSet.current) {
      baselineSet.current = true;
      markSeen({ upTo: Date.now() }).catch(() => {});
    }
  }, [newBadges?.needsBaseline, markSeen]);

  const earnedAt = newBadges?.badges[0]?.earnedAt;
  const defs = (newBadges?.badges ?? [])
    .filter((badge) => badge.earnedAt === earnedAt)
    .map((badge) => badgeById(badge.badgeId))
    .filter((def): def is BadgeDefinition => !!def);

  // Closing the sheet (Done, swipe or backdrop) is what marks them seen.
  const close = () => {
    if (earnedAt === undefined) return;
    setDismissedAt(earnedAt);
    markSeen({ upTo: earnedAt }).catch(() => {});
  };

  return (
    <OxModal
      visible={defs.length > 0 && dismissedAt !== earnedAt}
      onClose={close}
      title={defs.length > 1 ? "New badges" : "New badge"}
      showCloseButton={false}
      scrollable={false}
    >
      <View style={styles.badges}>
        {defs.map((def) => (
          <View key={def.id} style={styles.badge}>
            <BadgeMedal def={def} size={72} />
            <OxText style={[styles.name, { color: colors.ink }]}>{def.name}</OxText>
          </View>
        ))}
      </View>
      <OxButton title="Done" onPress={() => setDismissedAt(earnedAt ?? null)} />
    </OxModal>
  );
}

const styles = StyleSheet.create({
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: space[5],
    marginBottom: space[5],
  },
  badge: { alignItems: "center", gap: space[2] },
  name: { fontSize: 20, textAlign: "center" },
});
