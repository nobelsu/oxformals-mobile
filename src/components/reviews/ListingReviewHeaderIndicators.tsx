import { ConfirmAttendanceIndicator } from "@/src/components/reviews/ConfirmAttendanceIndicator";
import { RateFormalIndicator } from "@/src/components/reviews/RateFormalIndicator";
import { listingIsPast } from "@/lib/data/collegeReviewEligibility";
import type { Listing } from "@/src/lib/data/types";
import { StyleSheet, View } from "react-native";

type ReviewState = {
  canConfirmAttendance: boolean;
  hasConfirmedAttendance: boolean;
  canReview: boolean;
};

type Props = {
  listing: Listing;
  nowMs: number;
  reviewState: ReviewState | null | undefined;
};

export function ListingReviewHeaderIndicators({
  listing,
  nowMs,
  reviewState,
}: Props) {
  if (reviewState === undefined || reviewState === null) return null;

  const isPast = listingIsPast(listing.dateTime, nowMs);
  const canConfirmAttendance =
    reviewState.canConfirmAttendance && !reviewState.hasConfirmedAttendance;
  const canRate = reviewState.canReview;

  if (!isPast) return null;
  if (!canConfirmAttendance && !canRate) return null;

  return (
    <View style={styles.row}>
      {canConfirmAttendance ? (
        <ConfirmAttendanceIndicator />
      ) : canRate ? (
        <RateFormalIndicator />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    marginBottom: 8,
  },
});
