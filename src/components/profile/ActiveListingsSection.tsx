import { useAuth } from "@/src/components/auth/useAuth";
import { useData } from "@/src/components/data/useData";
import { useListFormalModal } from "@/src/components/listing/ListFormalModalProvider";
import { MyListingCard } from "@/src/components/swap/MyListingCard";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxText } from "@/src/components/ui/OxText";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { CARD_GAP } from "@/src/constants/layout";
import { space } from "@/src/constants/spacing";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

/** Your active listings, as the profile's Listings tab. */
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
      {myActiveListings.length === 0 ? (
        <View style={styles.empty}>
          <OxText style={[styles.emptyText, { color: colors.inkMuted }]}>
            No active listings
          </OxText>
          <OxButton title="List a formal" variant="secondary" onPress={openListFormal} />
        </View>
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
  empty: { alignItems: "center", gap: space[4], paddingVertical: space[6] },
  emptyText: { fontSize: 16 },
  cardList: { gap: CARD_GAP },
});
