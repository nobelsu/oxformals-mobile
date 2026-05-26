import { useAuth } from "@/src/components/auth/useAuth";
import { useData } from "@/src/components/data/useData";
import { useListingsHubData } from "@/src/components/reviews/useListingsHubData";
import { AttendedFormalsSection } from "@/src/components/swap/history/AttendedFormalsSection";
import { HistoryEmptyState } from "@/src/components/swap/history/HistoryEmptyState";
import { HistorySectionHeader } from "@/src/components/swap/history/HistorySectionHeader";
import { PastListingsCarousel } from "@/src/components/swap/history/PastListingsCarousel";
import { RequestsSection } from "@/src/components/swap/history/RequestsSection";
import { usePastListings } from "@/src/components/swap/history/usePastListings";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import {
  incomingRequestsForUser,
  outgoingRequestsForUser,
} from "@/src/lib/data/requestFilters";
import {
  SCREEN_PADDING,
  TAB_SCREEN_EDGES,
  TAB_SCREEN_TITLE_PADDING_TOP,
  TAB_SCROLL_EXTRA_BOTTOM,
} from "@/src/constants/layout";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function HistoryTab() {
  const router = useRouter();
  const { colors } = useOxTheme();
  const { user } = useAuth();
  const { requests } = useData();
  const pastListings = usePastListings();
  const {
    attendedPastListings,
    pendingReviewSet,
    pendingAttendanceSet,
  } = useListingsHubData();

  const hasAnyRequests = useMemo(() => {
    if (!user) return false;
    return (
      incomingRequestsForUser(requests, user.id).length > 0 ||
      outgoingRequestsForUser(requests, user.id).length > 0
    );
  }, [requests, user]);

  if (!user) return null;

  const isEmpty =
    pastListings.length === 0 &&
    attendedPastListings.length === 0 &&
    !hasAnyRequests;

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.bg }]}
      edges={TAB_SCREEN_EDGES}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          isEmpty && styles.scrollEmpty,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {isEmpty ? <HistoryEmptyState /> : null}

        {pastListings.length > 0 && (
          <View style={[styles.section, styles.pastListingsSection]}>
            <HistorySectionHeader
              title="Past listings"
              showSeeAll
              onSeeAll={() => router.push("/history/past-listings")}
            />
            <PastListingsCarousel
              listings={pastListings}
              pendingReviewSet={pendingReviewSet}
              pendingAttendanceSet={pendingAttendanceSet}
            />
          </View>
        )}

        <AttendedFormalsSection
          attendedPastListings={attendedPastListings}
          pendingReviewSet={pendingReviewSet}
          pendingAttendanceSet={pendingAttendanceSet}
        />

        {hasAnyRequests ? (
          <RequestsSection hasPastListings={pastListings.length > 0} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: TAB_SCREEN_TITLE_PADDING_TOP,
    paddingBottom: TAB_SCROLL_EXTRA_BOTTOM + 32,
  },
  scrollEmpty: {
    flexGrow: 1,
    justifyContent: "center",
  },
  section: { marginTop: 0 },
  pastListingsSection: { overflow: "visible" },
});
