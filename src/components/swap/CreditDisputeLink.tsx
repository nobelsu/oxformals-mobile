import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { OxText } from "@/src/components/ui/OxText";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { errorMessage } from "@/src/lib/errorMessage";
import { useMutation, useQuery } from "convex/react";
import { Alert, Pressable, StyleSheet } from "react-native";

/**
 * For a guest who paid with credits, after the formal: stops the host's
 * payout and sends it to the team. Renders nothing otherwise.
 */
export function CreditDisputeLink({ listingId }: { listingId: string }) {
  const { colors } = useOxTheme();
  const id = listingId as Id<"listings">;
  const holds = useQuery(api.credits.getMyHoldsForListing, { listingId: id });
  const report = useMutation(api.credits.reportFormalDidntHappen);

  if (!holds) return null;
  if (holds.disputed > 0) {
    return (
      <OxText style={[styles.text, { color: colors.inkMuted }]}>
        Reported. We&apos;ll sort out your credit.
      </OxText>
    );
  }
  if (holds.held === 0) return null;

  function confirm() {
    Alert.alert("Report that this formal didn't happen?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "It didn't happen",
        style: "destructive",
        onPress: () => {
          report({ listingId: id }).catch((error) =>
            Alert.alert("Couldn't send that", errorMessage(error)),
          );
        },
      },
    ]);
  }

  return (
    <Pressable
      onPress={confirm}
      hitSlop={8}
      style={styles.link}
      accessibilityRole="button"
    >
      <OxText
        style={[styles.text, styles.underline, { color: colors.inkMuted }]}
      >
        Formal didn&apos;t happen?
      </OxText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: { alignSelf: "center", minHeight: 32, justifyContent: "center" },
  text: { fontSize: 14, textAlign: "center", marginTop: 16 },
  underline: { textDecorationLine: "underline" },
});
