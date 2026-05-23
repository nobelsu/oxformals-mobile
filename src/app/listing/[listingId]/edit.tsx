import { useAuth } from "@/src/components/auth/useAuth";
import { useData } from "@/src/components/data/useData";
import { ListFormalForm } from "@/src/components/swap/ListFormalForm";
import { OxBackButton } from "@/src/components/ui/OxBackButton";
import { OxLoadingView } from "@/src/components/ui/OxLoadingView";
import { OxText } from "@/src/components/ui/OxText";
import { SCREEN_PADDING } from "@/src/constants/layout";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { oxText } from "@/src/constants/oxText";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import {
  canEditListing,
  listingEditBlockedReason,
} from "@/src/lib/data/listingEdit";
import { formatYearLabel } from "@/src/lib/data/format";
import { pendingIncomingRequestsForListing } from "@/src/lib/data/requestFilters";
import { useHeaderHeight } from "@react-navigation/elements";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function EditListingScreen() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const router = useRouter();
  const { colors } = useOxTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { requests, getListing, updateListing } = useData();

  const listing = getListing(listingId);
  const isOwner = user && listing && listing.ownerUserId === user.id;
  const pending = user && listing
    ? pendingIncomingRequestsForListing(requests, user.id, listing.id)
    : [];
  const editable = listing ? canEditListing(listing, pending.length) : false;
  const blockedReason = listing
    ? listingEditBlockedReason(listing, pending.length)
    : null;

  if (!listing) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <Stack.Screen options={{ title: "Edit listing" }} />
        <OxLoadingView message="Loading listing…" fill />
      </View>
    );
  }

  if (!isOwner) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <Stack.Screen options={{ title: "Edit listing" }} />
        <View style={styles.blocked}>
          <OxText style={{ color: colors.inkMuted }}>
            Only the listing owner can edit this listing.
          </OxText>
          <OxBackButton />
        </View>
      </View>
    );
  }

  if (!editable) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <Stack.Screen options={{ title: "Edit listing" }} />
        <View style={styles.blocked}>
          <OxText style={[oxText, { color: colors.inkMuted }]}>
            {blockedReason ?? "This listing cannot be edited."}
          </OxText>
          <OxBackButton />
        </View>
      </View>
    );
  }

  const profileLine = [
    formatYearLabel(listing.year) || listing.year,
    listing.role,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <Stack.Screen options={{ title: "Edit listing" }} />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.readOnly}>
          <OxText
            style={[
              styles.college,
              { color: colors.ink, fontFamily: FONT_DISPLAY },
            ]}
          >
            {listing.college}
          </OxText>
          {profileLine ? (
            <OxText style={[oxText, { color: colors.inkSoft, marginTop: 4 }]}>
              {profileLine}
            </OxText>
          ) : null}
          <OxText style={[oxText, { color: colors.inkMuted, marginTop: 8 }]}>
            College, year, and role cannot be changed here.
          </OxText>
        </View>

        <ListFormalForm
          mode="edit"
          initialListing={listing}
          onSubmit={async (input) => {
            await updateListing(listing.id, input);
            router.back();
          }}
          onCancel={() => router.back()}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 8,
  },
  readOnly: {
    marginBottom: 8,
  },
  college: {
    fontSize: 28,
    textTransform: "uppercase",
    lineHeight: 32,
  },
  blocked: {
    flex: 1,
    padding: SCREEN_PADDING,
    gap: 16,
    justifyContent: "center",
  },
});
