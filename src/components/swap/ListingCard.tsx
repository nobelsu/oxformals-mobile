import { Avatar } from "@/src/components/ui/Avatar";
import { Chip } from "@/src/components/ui/Chip";
import { ListingTypeTag } from "@/src/components/ui/ListingTypeTag";
import { OxButton } from "@/src/components/ui/OxButton";
import { SketchCard } from "@/src/components/ui/SketchCard";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import type { User } from "@/src/lib/auth/types";
import {
  formatListingDate,
  formatListingSeatsLabel,
  formatPrice,
  formatYearLabel,
} from "@/src/lib/data/format";
import { listingRequestCta } from "@/src/lib/data/listingType";
import type { Listing } from "@/src/lib/data/types";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { OxText } from "@/src/components/ui/OxText";
import { Pressable, StyleSheet, View } from "react-native";
import { ListingMenu } from "./ListingMenu";

type Props = {
  listing: Listing;
  owner: User;
  memberUsers?: User[];
  variant?: "compact" | "full";
  onRequest?: () => void;
  onPress?: () => void;
  disabled?: boolean;
  disabledLabel?: string;
  hideInterests?: boolean;
  hideFooter?: boolean;
  requestLabel?: string;
};

function seedFrom(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function ListingCard({
  listing,
  owner,
  memberUsers = [],
  variant = "full",
  onRequest,
  onPress,
  disabled,
  disabledLabel,
  hideInterests,
  hideFooter,
  requestLabel,
}: Props) {
  const { colors } = useOxTheme();
  const isCompact = variant === "compact";
  const cardPadding = isCompact ? 16 : 20;
  const ctaLabel = requestLabel ?? listingRequestCta(listing.listingType);
  const seatsLabel = formatListingSeatsLabel(listing.seatsAvailable);

  const profileLine = [
    formatYearLabel(owner.year) || owner.year || formatYearLabel(listing.year) || listing.year,
    owner.role || listing.role,
  ]
    .filter(Boolean)
    .join(" · ");

  const showFooter =
    !hideFooter &&
    (listing.status === "expired" ||
      listing.status === "confirmed" ||
      listing.status === "closed" ||
      listing.seatsAvailable === 0 ||
      disabled ||
      onRequest);

  const splitCardPress = !!onPress && !!onRequest;

  const footerShowsStatusBadge =
    showFooter &&
    (listing.status === "expired" ||
      listing.status === "confirmed" ||
      listing.status === "closed" ||
      listing.seatsAvailable === 0);

  const metaParts = [
    formatListingDate(listing.dateTime),
    `Group of ${listing.groupSize}`,
    !footerShowsStatusBadge ? seatsLabel : null,
    listing.price !== undefined ? formatPrice(listing.price) : null,
  ].filter(Boolean) as string[];

  const footer = showFooter ? (
    <View style={styles.footer}>
      {listing.status === "expired" ? (
        <OxText
          style={[styles.badge, { color: colors.ink, borderColor: colors.ink }]}
        >
          Past
        </OxText>
      ) : listing.status === "confirmed" || listing.status === "closed" ? (
        <OxText
          style={[styles.badge, { color: colors.ink, borderColor: colors.ink }]}
        >
          {listing.seatsAvailable === 0 ? "Group full" : "Listing full"}
        </OxText>
      ) : listing.seatsAvailable === 0 ? (
        <OxText
          style={[styles.badge, { color: colors.ink, borderColor: colors.ink }]}
        >
          Group full
        </OxText>
      ) : disabled ? (
        <OxButton title={disabledLabel ?? ctaLabel} disabled />
      ) : (
        <OxButton title={ctaLabel} onPress={onRequest} />
      )}
    </View>
  ) : null;

  const mainContent = (
    <>
      <View style={styles.headerRow}>
        <OxText
          style={[
            styles.college,
            { color: colors.ink, fontFamily: FONT_DISPLAY },
          ]}
          numberOfLines={3}
        >
          {listing.college}
        </OxText>
        <ListingTypeTag listingType={listing.listingType} />
      </View>

      <OxText style={[styles.meta, { color: colors.inkMuted }]}>
        {metaParts.join(" · ")}
      </OxText>

      <View style={styles.ownerRow}>
        <Avatar avatar={owner.avatar} name={owner.name} size={48} />
        <View style={styles.ownerText}>
          <OxText style={[styles.ownerName, { color: colors.ink }]}>
            {owner.name.split(" ")[0]}
          </OxText>
          <OxText
            style={{ color: colors.inkSoft, fontSize: 13 }}
            numberOfLines={1}
          >
            {profileLine ||
              [owner.college, formatYearLabel(owner.year) || owner.year]
                .filter(Boolean)
                .join(" · ")}
          </OxText>
        </View>
      </View>

      {!isCompact && !hideInterests && owner.interests.length > 0 && (
        <View style={styles.chips}>
          {owner.interests.map((tag) => (
            <Chip key={tag} label={tag} />
          ))}
        </View>
      )}

      {!isCompact && (
        <ListingMenu
          menu={listing.menu}
          menuPdfUrl={listing.menuPdfUrl}
          menuFileContentType={listing.menuFileContentType}
          numberOfLines={undefined}
        />
      )}

      {listing.message ? (
        <OxText
          style={[
            styles.message,
            isCompact ? styles.messageCompact : null,
            { color: colors.inkMuted },
          ]}
          numberOfLines={isCompact ? 2 : undefined}
        >
          {`"${listing.message}"`}
        </OxText>
      ) : null}

      {!isCompact && memberUsers.length > 0 && (
        <View style={styles.membersRow}>
          <OxText style={[styles.membersLabel, { color: colors.inkSoft }]}>
            Dining with:
          </OxText>
          <View style={styles.memberAvatars}>
            {memberUsers.map((m) => (
              <View key={m.id} style={styles.memberAvatar}>
                <Avatar avatar={m.avatar} name={m.name} size={32} />
              </View>
            ))}
          </View>
        </View>
      )}
    </>
  );

  if (splitCardPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`View ${listing.college} listing`}
        style={({ pressed }) => [{ opacity: pressed ? 0.96 : 1 }]}
      >
        <SketchCard seed={seedFrom(listing.id)} padding={cardPadding}>
          {mainContent}
          {footer}
        </SketchCard>
      </Pressable>
    );
  }

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`View ${listing.college} listing`}
        style={({ pressed }) => [{ opacity: pressed ? 0.96 : 1 }]}
      >
        <SketchCard seed={seedFrom(listing.id)} padding={cardPadding}>
          {mainContent}
          {footer}
        </SketchCard>
      </Pressable>
    );
  }

  return (
    <SketchCard seed={seedFrom(listing.id)} padding={cardPadding}>
      {mainContent}
      {footer}
    </SketchCard>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  college: {
    flex: 1,
    fontSize: 26,
    textTransform: "uppercase",
    lineHeight: 30,
  },
  meta: { fontSize: 13, marginBottom: 12 },
  ownerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  ownerText: { flex: 1, minWidth: 0 },
  ownerName: { fontSize: 18 },
  chips: { flexDirection: "row", flexWrap: "wrap", marginVertical: 4 },
  message: { fontSize: 14, marginVertical: 8, lineHeight: 20 },
  messageCompact: { marginTop: 4, marginBottom: 0 },
  membersRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    flexWrap: "wrap",
  },
  membersLabel: { fontSize: 12 },
  memberAvatars: { flexDirection: "row", flexWrap: "wrap" },
  memberAvatar: { marginRight: -6 },
  footer: { marginTop: 16, alignItems: "center" },
  badge: {
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
    fontSize: 13,
  },
});
