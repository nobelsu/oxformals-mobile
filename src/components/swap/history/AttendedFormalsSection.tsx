import { useData } from "@/src/components/data/useData";
import { MyListingCard } from "@/src/components/swap/MyListingCard";
import { HistorySectionHeader } from "@/src/components/swap/history/HistorySectionHeader";
import type { Listing } from "@/src/lib/data/types";
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

type Props = {
  attendedPastListings: Listing[];
  pendingReviewSet: Set<string>;
  pendingAttendanceSet: Set<string>;
};

export function AttendedFormalsSection({
  attendedPastListings,
  pendingReviewSet,
  pendingAttendanceSet,
}: Props) {
  const router = useRouter();
  const { getUser } = useData();

  if (attendedPastListings.length === 0) return null;

  return (
    <View style={styles.section}>
      <HistorySectionHeader title="Formals I attended" />
      <View style={styles.grid}>
        {attendedPastListings.map((listing) => {
          const owner = getUser(listing.ownerUserId);
          if (!owner) return null;
          return (
            <View key={listing.id} style={styles.cardWrap}>
              <MyListingCard
                listing={listing}
                pendingRequestCount={0}
                memberUsers={[owner]}
                canConfirmAttendance={pendingAttendanceSet.has(listing.id)}
                canRate={pendingReviewSet.has(listing.id)}
                compact
                onPress={() => router.push(`/listing/${listing.id}`)}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 24 },
  grid: { gap: 12 },
  cardWrap: {},
});
