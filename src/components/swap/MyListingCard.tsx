import { ListingGroupChatButton } from "@/src/components/chat/ListingGroupChatButton";
import { ConfirmAttendanceIndicator } from "@/src/components/reviews/ConfirmAttendanceIndicator";
import { RateFormalIndicator } from "@/src/components/reviews/RateFormalIndicator";
import { Avatar } from "@/src/components/ui/Avatar";
import { listingIsPast } from "@/lib/data/collegeReviewEligibility";
import { useNowMs } from "@/src/lib/hooks/useNowMs";
import { ListingTypeTag } from "@/src/components/ui/ListingTypeTag";
import { OxButton } from "@/src/components/ui/OxButton";
import { SketchCard } from "@/src/components/ui/SketchCard";
import type { Id } from "@/convex/_generated/dataModel";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { oxText } from "@/src/constants/oxText";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import type { User } from "@/src/lib/auth/types";
import {
  formatListingDate,
  formatListingStatusLabel,
  formatPrice,
  formatYearLabel,
} from "@/src/lib/data/format";
import type { Listing } from "@/src/lib/data/types";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  listing: Listing;
  pendingRequestCount: number;
  profile?: {
    year?: string;
    role?: string;
  };
  memberUsers?: User[];
  onViewRequests?: () => void;
  onPress?: () => void;
  compact?: boolean;
  canRate?: boolean;
  canConfirmAttendance?: boolean;
};

function seedFrom(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function MyListingCard({
  listing,
  pendingRequestCount,
  profile,
  memberUsers = [],
  onViewRequests,
  onPress,
  compact = false,
  canRate = false,
  canConfirmAttendance = false,
}: Props) {
  const { colors } = useOxTheme();
  const nowMs = useNowMs();
  const isPastFormal = listingIsPast(listing.dateTime, nowMs);

  const seatsLabel =
    listing.seatsAvailable === 0
      ? "Group full"
      : `${listing.seatsAvailable} ${listing.seatsAvailable === 1 ? "seat" : "seats"} left`;

  const profileLine = [
    formatYearLabel(profile?.year || "") ||
      profile?.year ||
      formatYearLabel(listing.year) ||
      listing.year,
    profile?.role || listing.role,
  ]
    .filter(Boolean)
    .join(" · ");

  const statusLabel = formatListingStatusLabel(
    listing.status,
    listing.seatsAvailable,
  );

  const statusCoversSeats =
    statusLabel === "Listing full" ||
    statusLabel === "Group full" ||
    statusLabel === "Past" ||
    statusLabel === "Closed";

  const metaParts = [
    formatListingDate(listing.dateTime),
    `Group of ${listing.groupSize}`,
    !statusCoversSeats ? seatsLabel : null,
    listing.price !== undefined ? formatPrice(listing.price) : null,
  ].filter(Boolean) as string[];

  const isPast =
    listing.status === "confirmed" ||
    listing.status === "closed" ||
    listing.status === "expired";

  const showReviewIndicators =
    isPastFormal && (canConfirmAttendance || canRate);

  const content = (
    <>
      <View style={[styles.header, styles.headerRow]}>
        <Text
          style={[
            styles.college,
            compact && styles.collegeCompact,
            { color: colors.ink, fontFamily: FONT_DISPLAY },
          ]}
          numberOfLines={compact ? 2 : 3}
        >
          {listing.college}
        </Text>
        <View style={styles.headerTags}>
          <ListingTypeTag listingType={listing.listingType} />
          <View style={[styles.statusChip, { borderColor: colors.ink }]}>
            <Text style={[styles.statusText, oxText, { color: colors.ink }]}>
              {statusLabel}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.metaRow}>
        {metaParts.map((part, i) => (
          <Text
            key={`${i}-${part}`}
            style={[styles.meta, oxText, { color: colors.inkMuted }]}
          >
            {i > 0 ? " · " : ""}
            {part}
          </Text>
        ))}
      </View>

      {profileLine ? (
        <Text style={[oxText, styles.profileLine, { color: colors.inkSoft }]}>
          {profileLine}
        </Text>
      ) : null}

      {(memberUsers.length > 0 || showReviewIndicators) && (
        <View style={styles.membersFooter}>
          {memberUsers.length > 0 ? (
            <View style={styles.membersRow}>
              <Text style={[styles.membersLabel, oxText, { color: colors.inkSoft }]}>
                Dining with:
              </Text>
              <View style={styles.memberAvatars}>
                {memberUsers.map((m) => (
                  <View key={m.id} style={styles.memberAvatar}>
                    <Avatar avatar={m.avatar} name={m.name} size={32} />
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.membersRowSpacer} />
          )}
          {showReviewIndicators ? (
            canConfirmAttendance ? (
              <ConfirmAttendanceIndicator />
            ) : canRate ? (
              <RateFormalIndicator />
            ) : null
          ) : null}
        </View>
      )}

      {pendingRequestCount > 0 && (
        <Text style={[oxText, { color: colors.danger, marginTop: 8 }]}>
          {pendingRequestCount} pending request
          {pendingRequestCount === 1 ? "" : "s"}
        </Text>
      )}

      <View style={[styles.footer, compact && styles.footerCompact]}>
        {listing.members.length >= 2 ? (
          <ListingGroupChatButton
            listingId={listing.id as Id<"listings">}
            memberCount={listing.members.length}
            style={!isPast && onViewRequests ? { marginBottom: 8 } : undefined}
          />
        ) : null}
        {!isPast && onViewRequests ? (
          <OxButton title="Manage" onPress={onViewRequests} />
        ) : null}
      </View>
    </>
  );

  const card = (
    <SketchCard seed={seedFrom(listing.id)} padding={16}>
      {content}
    </SketchCard>
  );

  const pressHandler = onPress ?? onViewRequests;
  if (pressHandler) {
    return <Pressable onPress={pressHandler}>{card}</Pressable>;
  }

  return card;
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  college: {
    flex: 1,
    fontSize: 26,
    textTransform: "uppercase",
    lineHeight: 30,
  },
  collegeCompact: {
    fontSize: 22,
    lineHeight: 26,
  },
  headerTags: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  statusChip: {
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  meta: { fontSize: 13 },
  profileLine: { fontSize: 13, marginTop: 4 },
  membersFooter: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 10,
  },
  membersRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    flex: 1,
    minWidth: 0,
  },
  membersRowSpacer: { flex: 1 },
  membersLabel: { fontSize: 12 },
  memberAvatars: { flexDirection: "row", flexWrap: "wrap" },
  memberAvatar: { marginRight: -6 },
  footer: { marginTop: 16, alignItems: "flex-start" },
  footerCompact: { marginTop: 12 },
});
