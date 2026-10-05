import { useAuth } from "@/src/components/auth/useAuth";
import { useData } from "@/src/components/data/useData";
import { ListingReviewHeaderIndicators } from "@/src/components/reviews/ListingReviewHeaderIndicators";
import { ReviewFormalSection } from "@/src/components/reviews/ReviewFormalSection";
import { ListingDetailContent } from "@/src/components/swap/ListingDetailContent";
import {
  isGuestForCollegeListing,
  listingIsPast,
} from "@/lib/data/collegeReviewEligibility";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useNowMs } from "@/src/lib/hooks/useNowMs";
import { useQuery } from "convex/react";
import { ReportSheet } from "@/src/components/report/ReportSheet";
import { CreditDisputeLink } from "@/src/components/swap/CreditDisputeLink";
import { ListingMembership } from "@/src/components/swap/ListingMembership";
import { useListingRequest } from "@/src/components/swap/listingRequestFlow";
import {
  partyWaitingReason,
  RequestPartyNote,
} from "@/src/components/swap/RequestPartyNote";
import { FeedListingStatus } from "@/src/components/feed/FeedListingStatus";
import { OxBackButton } from "@/src/components/ui/OxBackButton";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxLoadingView } from "@/src/components/ui/OxLoadingView";
import { SketchCard } from "@/src/components/ui/SketchCard";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { DISPLAY_SECTION, SCREEN_PADDING, SECTION_GAP } from "@/src/constants/layout";
import {
  findBlockingOutgoingRequestForTarget,
  incomingRequestsForListing,
  pendingIncomingRequestsForListing,
} from "@/src/lib/data/requestFilters";
import { canEditListing } from "@/src/lib/data/listingEdit";
import { listingRequestCta } from "@/src/lib/data/listingType";
import { oxText } from "@/src/constants/oxText";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { OxText } from "@/src/components/ui/OxText";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { listingShareTarget, openShareMenu } from "@/src/lib/share/share";
import { Ionicons } from "@expo/vector-icons";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ListingDetailScreen() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const router = useRouter();
  const { colors } = useOxTheme();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuth();
  const {
    listingsLoaded,
    listings,
    requests,
    getUser,
    acceptRequest,
    declineRequest,
    deleteListing,
  } = useData();

  const { onCardRequest, modals } = useListingRequest({
    onSignInRequired: () => router.replace("/login"),
    onNavigateToRequests: () => router.push("/(tabs)/mine"),
  });

  const listing = listings.find((l) => l.id === listingId);
  const owner = listing ? getUser(listing.ownerUserId) : undefined;
  const memberUsers =
    listing && owner
      ? (listing.members ?? [])
          .filter((mid) => mid !== listing.ownerUserId)
          .map(getUser)
          .filter((u): u is NonNullable<typeof u> => !!u)
      : [];
  const isOwner = user && listing && listing.ownerUserId === user.id;
  const nowMs = useNowMs();
  const [reporting, setReporting] = useState(false);

  const isMember =
    !!listing && isAuthenticated && !!user && listing.members.includes(user.id);
  // Visitors can rate the college; anyone in the group can say they went.
  const isGuestMember =
    isMember && !!user && !!listing && isGuestForCollegeListing(user, listing.college);

  const reviewState = useQuery(
    api.collegeReviews.getListingReviewState,
    isMember && listing
      ? { listingId: listing.id as Id<"listings">, nowMs }
      : "skip",
  );

  const showReviewSection = isMember || !!reviewState?.existingReview;

  const incoming = user && listing
    ? incomingRequestsForListing(requests, user.id, listing.id)
    : [];
  const pending = user && listing
    ? pendingIncomingRequestsForListing(requests, user.id, listing.id)
    : [];

  if (!listing || !owner) {
    // Loaded but absent: cancelled, or hidden because of a block.
    if (listingsLoaded && !listing) {
      return (
        <View style={[styles.root, styles.gone, { backgroundColor: colors.bg }]}>
          <OxText style={{ color: colors.ink, fontSize: 20, textAlign: "center" }}>
            This formal is no longer available.
          </OxText>
          <OxButton title="Back" variant="secondary" onPress={() => router.back()} />
        </View>
      );
    }
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <OxLoadingView message="Loading listing…" fill />
      </View>
    );
  }

  const alreadyRequested =
    !!user && !!findBlockingOutgoingRequestForTarget(requests, user.id, listing.id);
  const canRequest =
    !isOwner &&
    !alreadyRequested &&
    isAuthenticated &&
    listing.status === "active" &&
    listing.seatsAvailable > 0;

  const canEdit = isOwner && canEditListing(listing, pending.length);
  const showEditBlockedNote =
    isOwner && pending.length > 0 && listing.status !== "expired";

  const activeListingId = listing.id;

  function confirmDeleteListing() {
    const guests = listing ? listing.members.length - 1 : 0;
    const guestNote =
      guests > 0
        ? ` Your ${guests === 1 ? "guest is" : `${guests} guests are`} told and refunded.`
        : "";
    const pendingNote =
      pending.length > 0
        ? ` ${pending.length} pending request${pending.length === 1 ? "" : "s"} will be declined.`
        : "";
    Alert.alert(
      "Cancel this formal?",
      `This can't be undone.${guestNote}${pendingNote}`,
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Cancel formal",
          style: "destructive",
          onPress: () => {
            deleteListing(activeListingId);
            router.back();
          },
        },
      ],
    );
  }

  function shareListing() {
    if (listing) openShareMenu(listingShareTarget(listing));
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={[styles.root, { backgroundColor: colors.bg }]}
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, SCREEN_PADDING) },
        ]}
      >
        <View style={styles.backRow}>
          <OxBackButton />
          <Pressable
            onPress={shareListing}
            hitSlop={10}
            style={styles.share}
            accessibilityRole="button"
            accessibilityLabel="Share this formal"
          >
            <Ionicons name="share-outline" size={24} color={colors.ink} />
          </Pressable>
        </View>
        <ListingDetailContent
          listing={listing}
          owner={owner}
          memberUsers={memberUsers}
        />
        {isGuestMember ? (
          <ListingReviewHeaderIndicators
            listing={listing}
            nowMs={nowMs}
            reviewState={reviewState}
          />
        ) : null}

        {showReviewSection ? (
          <View style={styles.reviewSection}>
            <ReviewFormalSection
              listingId={listing.id}
              college={listing.college}
            />
          </View>
        ) : null}

        {isOwner && (
          <View style={styles.section}>
            <OxText
              style={[
                styles.heading,
                { color: colors.ink, fontFamily: FONT_DISPLAY },
              ]}
            >
              {pending.length > 0 ? `Requests (${pending.length})` : "Requests"}
            </OxText>
            {incoming.map((r) => {
              const from = getUser(r.fromUserId);
              return (
                <SketchCard
                  key={r.id}
                  seed={r.id.length}
                  padding={12}
                  style={styles.requestCard}
                >
                  <OxText style={{ color: colors.ink }}>
                    {from?.name ?? "User"} · {r.status}
                  </OxText>
                  <RequestPartyNote request={r} price={listing.price} />
                  {r.message ? (
                    <OxText style={{ color: colors.inkMuted, marginTop: 4 }}>
                      {r.message}
                    </OxText>
                  ) : null}
                  {r.status === "pending" && (
                    <View style={styles.actions}>
                      <OxButton
                        title="Accept"
                        disabled={
                          partyWaitingReason(r, (id) => getUser(id)?.name) !== null
                        }
                        onPress={() => acceptRequest(r.id)}
                      />
                      <OxButton
                        title="Decline"
                        variant="secondary"
                        onPress={() => declineRequest(r.id)}
                        style={{ marginTop: 8 }}
                      />
                    </View>
                  )}
                </SketchCard>
              );
            })}
            {canEdit ? (
              <OxButton
                title="Edit listing"
                variant="secondary"
                onPress={() => router.push(`/listing/${listing.id}/edit`)}
                style={{ marginTop: 16 }}
              />
            ) : null}
            {showEditBlockedNote ? (
              <OxText
                style={[
                  oxText,
                  { color: colors.inkMuted, marginTop: canEdit ? 8 : 16 },
                ]}
              >
                Resolve pending requests before editing.
              </OxText>
            ) : null}
            <OxButton
              title="Cancel formal"
              variant="danger"
              onPress={confirmDeleteListing}
              style={{ marginTop: 16 }}
            />
          </View>
        )}

        {user ? (
          <ListingMembership
            listing={listing}
            viewerId={user.id}
            isPast={listingIsPast(listing.dateTime, nowMs)}
          />
        ) : null}

        {isMember && !isOwner && listingIsPast(listing.dateTime, nowMs) ? (
          <CreditDisputeLink listingId={listing.id} />
        ) : null}

        {!isOwner ? <FeedListingStatus listing={listing} /> : null}
        {canRequest && (
          <OxButton
            title={listingRequestCta(listing.listingType)}
            onPress={() => onCardRequest(listing)}
            style={{ marginTop: SECTION_GAP }}
          />
        )}
        {user && !isOwner ? (
          <Pressable
            onPress={() => setReporting(true)}
            hitSlop={8}
            style={styles.report}
            accessibilityRole="button"
          >
            <OxText style={{ color: colors.inkSoft, fontSize: 14 }}>
              Report this listing
            </OxText>
          </Pressable>
        ) : null}
      </ScrollView>
      <ReportSheet
        target={
          reporting ? { kind: "listing", listingId: listing.id as Id<"listings"> } : null
        }
        subject="this listing"
        onClose={() => setReporting(false)}
      />
      {modals}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  share: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  report: { alignSelf: "center", marginTop: 24, minHeight: 32, justifyContent: "center" },
  gone: { alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
  content: { padding: SCREEN_PADDING, paddingBottom: 40 },
  backRow: {
    marginBottom: SECTION_GAP,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  section: { marginTop: 24 },
  heading: {
    fontSize: DISPLAY_SECTION,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  requestCard: { marginBottom: 8 },
  actions: { marginTop: 8 },
  reviewSection: { marginTop: SECTION_GAP },
});
