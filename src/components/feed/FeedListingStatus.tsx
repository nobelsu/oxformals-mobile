import { useAuth } from "@/src/components/auth/useAuth";
import { useData } from "@/src/components/data/useData";
import { OxText } from "@/src/components/ui/OxText";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import {
  findBlockingOutgoingRequestForTarget,
  pendingIncomingRequestsForListing,
} from "@/src/lib/data/requestFilters";
import type { Listing } from "@/src/lib/data/types";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, View } from "react-native";

/**
 * Where you stand with a listing in the feed: requests waiting on your own
 * listing, or the state of a request you sent. Renders nothing otherwise.
 */
export function FeedListingStatus({ listing }: { listing: Listing }) {
  const { colors } = useOxTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { requests, withdrawRequest } = useData();
  if (!user) return null;

  if (listing.ownerUserId === user.id) {
    const waiting = pendingIncomingRequestsForListing(requests, user.id, listing.id).length;
    if (waiting === 0) return null;
    return (
      <Pressable
        onPress={() => router.push(`/listing/${listing.id}`)}
        style={[styles.strip, { borderTopColor: colors.inkSoft }]}
        accessibilityRole="button"
      >
        <View style={[styles.pill, { backgroundColor: colors.accent }]}>
          <OxText style={[styles.pillText, { color: colors.accentInk }]}>
            {waiting} request{waiting === 1 ? "" : "s"} waiting
          </OxText>
        </View>
        <Ionicons name="chevron-forward-outline" size={18} color={colors.inkMuted} />
      </Pressable>
    );
  }

  const sent = findBlockingOutgoingRequestForTarget(requests, user.id, listing.id);
  if (!sent) return null;
  const pending = sent.status === "pending";

  const confirmWithdraw = () =>
    Alert.alert("Withdraw this request?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Withdraw",
        style: "destructive",
        onPress: () => withdrawRequest(sent.id),
      },
    ]);

  return (
    <View style={[styles.strip, { borderTopColor: colors.inkSoft }]}>
      <View
        style={[
          styles.pill,
          pending
            ? { borderColor: colors.inkMuted, borderWidth: 1.5 }
            : { backgroundColor: colors.accent },
        ]}
      >
        <OxText
          style={[
            styles.pillText,
            { color: pending ? colors.inkMuted : colors.accentInk },
          ]}
        >
          {pending ? "Requested" : "You're going"}
        </OxText>
      </View>
      {pending ? (
        <Pressable onPress={confirmWithdraw} hitSlop={10} accessibilityRole="button">
          <OxText style={[styles.withdraw, { color: colors.ink }]}>Withdraw</OxText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  pillText: { fontSize: 13 },
  withdraw: { fontSize: 14 },
});
