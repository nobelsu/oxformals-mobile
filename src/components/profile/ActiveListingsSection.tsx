import { useAuth } from "@/src/components/auth/useAuth";
import { useData } from "@/src/components/data/useData";
import { useListFormalModal } from "@/src/components/listing/ListFormalModalProvider";
import { MyListingCard } from "@/src/components/swap/MyListingCard";
import { DoodleAddButton } from "@/src/components/ui/DoodleAddButton";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { oxText } from "@/src/constants/oxText";
import { CARD_GAP, tabScreenTitleText } from "@/src/constants/layout";
import { space } from "@/src/constants/spacing";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

export function ActiveListingsSection() {
  const router = useRouter();
  const { colors } = useOxTheme();
  const { user } = useAuth();
  const { requests, listings, getUser } = useData();
  const { openListFormal } = useListFormalModal();

  const myListings = useMemo(
    () => (user ? listings.filter((l) => l.ownerUserId === user.id) : []),
    [listings, user],
  );

  const myActiveListings = useMemo(
    () => myListings.filter((l) => l.status === "active"),
    [myListings],
  );

  const pendingCountByListing = useMemo(() => {
    const map = new Map<string, number>();
    if (!user) return map;
    for (const r of requests) {
      if (r.status !== "pending" || r.toUserId !== user.id) continue;
      map.set(r.targetListingId, (map.get(r.targetListingId) ?? 0) + 1);
    }
    return map;
  }, [requests, user]);

  if (!user) return null;

  const profile = { year: user.year, role: user.role };

  return (
    <>
      <View style={styles.header}>
        <Text style={[tabScreenTitleText, { color: colors.ink }]}>
          Active listings
        </Text>
        <DoodleAddButton
          seed={18}
          accessibilityLabel="List a formal"
          onPress={openListFormal}
        />
      </View>

      {myActiveListings.length === 0 ? (
        <Text style={[oxText, { color: colors.inkMuted }]}>
          You don&apos;t have any active listings yet. Tap + to list a formal.
        </Text>
      ) : (
        <View style={styles.cardList}>
          {myActiveListings.map((listing) => {
            const members = listing.members
              .map(getUser)
              .filter((u): u is NonNullable<typeof u> => !!u);
            return (
              <MyListingCard
                key={listing.id}
                listing={listing}
                pendingRequestCount={
                  pendingCountByListing.get(listing.id) ?? 0
                }
                profile={profile}
                memberUsers={members}
                onViewRequests={() => router.push(`/listing/${listing.id}`)}
              />
            );
          })}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: space[6],
    marginBottom: 12,
  },
  cardList: { gap: CARD_GAP },
});
