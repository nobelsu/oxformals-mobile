import { useAuth } from "@/src/components/auth/useAuth";
import { useData } from "@/src/components/data/useData";
import { ListingDetailContent } from "@/src/components/swap/ListingDetailContent";
import { useListingRequest } from "@/src/components/swap/listingRequestFlow";
import { OxBackButton } from "@/src/components/ui/OxBackButton";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxLoadingView } from "@/src/components/ui/OxLoadingView";
import { SketchCard } from "@/src/components/ui/SketchCard";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { DISPLAY_SECTION, SCREEN_PADDING, SECTION_GAP } from "@/src/constants/layout";
import {
  incomingRequestsForListing,
  pendingIncomingRequestsForListing,
} from "@/src/lib/data/requestFilters";
import { listingRequestCta } from "@/src/lib/data/listingType";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { OxText } from "@/src/components/ui/OxText";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ListingDetailScreen() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const router = useRouter();
  const { colors } = useOxTheme();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuth();
  const {
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

  const incoming = user && listing
    ? incomingRequestsForListing(requests, user.id, listing.id)
    : [];
  const pending = user && listing
    ? pendingIncomingRequestsForListing(requests, user.id, listing.id)
    : [];

  if (!listing || !owner) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <OxLoadingView message="Loading listing…" fill />
      </View>
    );
  }

  const canRequest =
    !isOwner &&
    isAuthenticated &&
    listing.status === "active" &&
    listing.seatsAvailable > 0;

  const activeListingId = listing.id;

  function confirmDeleteListing() {
    const pendingNote =
      pending.length > 0
        ? ` ${pending.length} pending request${pending.length === 1 ? "" : "s"} will be declined.`
        : "";
    Alert.alert(
      "Delete listing",
      `This permanently removes your listing and cannot be undone.${pendingNote}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteListing(activeListingId);
            router.back();
          },
        },
      ],
    );
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
        </View>
        <ListingDetailContent
          listing={listing}
          owner={owner}
          memberUsers={memberUsers}
        />

        {isOwner && (
          <View style={styles.section}>
            <OxText
              style={[
                styles.heading,
                { color: colors.ink, fontFamily: FONT_DISPLAY },
              ]}
            >
              Incoming requests ({pending.length})
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
                  {r.message ? (
                    <OxText style={{ color: colors.inkMuted, marginTop: 4 }}>
                      {r.message}
                    </OxText>
                  ) : null}
                  {r.status === "pending" && (
                    <View style={styles.actions}>
                      <OxButton
                        title="Accept"
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
            <OxButton
              title="Delete listing"
              variant="danger"
              onPress={confirmDeleteListing}
              style={{ marginTop: 16 }}
            />
          </View>
        )}

        {canRequest && (
          <OxButton
            title={listingRequestCta(listing.listingType)}
            onPress={() => onCardRequest(listing)}
            style={{ marginTop: SECTION_GAP }}
          />
        )}
      </ScrollView>
      {modals}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: SCREEN_PADDING, paddingBottom: 40 },
  backRow: { marginBottom: SECTION_GAP },
  section: { marginTop: 24 },
  heading: {
    fontSize: DISPLAY_SECTION,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  requestCard: { marginBottom: 8 },
  actions: { marginTop: 8 },
});
