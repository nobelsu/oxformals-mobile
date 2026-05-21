import { useAuth } from "@/src/components/auth/useAuth";
import { Avatar } from "@/src/components/ui/Avatar";
import { Chip } from "@/src/components/ui/Chip";
import { DoodleDivider } from "@/src/components/ui/DoodleDivider";
import { ListingTypeTag } from "@/src/components/ui/ListingTypeTag";
import { OxText } from "@/src/components/ui/OxText";
import { DISPLAY_HERO, SECTION_GAP } from "@/src/constants/layout";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import type { User } from "@/src/lib/auth/types";
import {
  formatListingDate,
  formatListingSeatsLabel,
  formatPrice,
  formatYearLabel,
} from "@/src/lib/data/format";
import { openProfile } from "@/src/lib/profile/navigation";
import type { Listing } from "@/src/lib/data/types";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { hasListingMenu, ListingMenu } from "./ListingMenu";

type Props = {
  listing: Listing;
  owner: User;
  memberUsers?: User[];
};

function statusLabel(listing: Listing): string | null {
  if (listing.status === "expired") return "Past";
  if (listing.status === "confirmed" || listing.status === "closed") {
    return listing.seatsAvailable === 0 ? "Group full" : "Listing full";
  }
  if (listing.seatsAvailable === 0) return "Group full";
  return null;
}

export function ListingDetailContent({
  listing,
  owner,
  memberUsers = [],
}: Props) {
  const { colors } = useOxTheme();
  const router = useRouter();
  const { user: currentUser } = useAuth();

  const badge = statusLabel(listing);
  const seatsLabel = formatListingSeatsLabel(listing.seatsAvailable);
  const metaParts = [
    formatListingDate(listing.dateTime),
    `Group of ${listing.groupSize}`,
    badge == null ? seatsLabel : null,
    listing.price !== undefined ? formatPrice(listing.price) : null,
  ].filter(Boolean) as string[];

  const profileLine = [
    formatYearLabel(owner.year) || owner.year || formatYearLabel(listing.year) || listing.year,
    owner.role || listing.role,
    owner.subject?.trim(),
  ]
    .filter(Boolean)
    .join(" · ");

  const showMenu = hasListingMenu(listing.menu, listing.menuPdfUrl);
  const showMessage = !!listing.message?.trim();
  const showInterests = owner.interests.length > 0;
  const showMembers = memberUsers.length > 0;

  return (
    <View style={styles.root}>
      <OxText
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
        ellipsizeMode="tail"
        style={[
          styles.college,
          { color: colors.ink, fontFamily: FONT_DISPLAY },
        ]}
      >
        {listing.college}
      </OxText>

      <OxText style={[styles.meta, { color: colors.inkMuted }]}>
        {metaParts.join(" · ")}
      </OxText>

      <View style={styles.headerTags}>
        <ListingTypeTag listingType={listing.listingType} />
        {badge ? (
          <View style={[styles.statusChip, { borderColor: colors.ink }]}>
            <OxText style={[styles.statusText, { color: colors.ink }]}>
              {badge}
            </OxText>
          </View>
        ) : null}
      </View>

      <DoodleDivider seed={listing.id.length} marginVertical={SECTION_GAP / 2} />

      <Pressable
        style={styles.hostRow}
        onPress={() => openProfile(router, owner.id, currentUser?.id)}
      >
        <Avatar avatar={owner.avatar} name={owner.name} size={64} />
        <View style={styles.hostText}>
          <OxText style={[styles.hostName, { color: colors.ink }]}>
            {owner.name.split(" ")[0]}
          </OxText>
          <OxText style={[styles.hostMeta, { color: colors.inkSoft }]}>
            {profileLine ||
              [owner.college, formatYearLabel(owner.year) || owner.year]
                .filter(Boolean)
                .join(" · ")}
          </OxText>
        </View>
      </Pressable>

      {showInterests ? (
        <View style={styles.section}>
          <OxText style={[styles.sectionLabel, { color: colors.inkSoft }]}>
            Interests
          </OxText>
          <View style={styles.chips}>
            {owner.interests.map((tag) => (
              <Chip key={tag} label={tag} />
            ))}
          </View>
        </View>
      ) : null}

      {(showMenu || showMessage) && showInterests ? (
        <DoodleDivider seed={listing.id.length + 7} marginVertical={SECTION_GAP / 2} />
      ) : null}

      {showMenu ? (
        <View style={styles.section}>
          <OxText style={[styles.sectionLabel, { color: colors.inkSoft }]}>
            Menu
          </OxText>
          <ListingMenu
            menu={listing.menu}
            menuPdfUrl={listing.menuPdfUrl}
            menuFileContentType={listing.menuFileContentType}
            numberOfLines={undefined}
          />
        </View>
      ) : null}

      {showMessage ? (
        <View style={styles.section}>
          <OxText style={[styles.sectionLabel, { color: colors.inkSoft }]}>
            Message
          </OxText>
          <OxText style={[styles.message, { color: colors.inkMuted }]}>
            {`"${listing.message}"`}
          </OxText>
        </View>
      ) : null}

      {showMembers && (showInterests || showMenu || showMessage) ? (
        <DoodleDivider seed={listing.id.length + 3} marginVertical={SECTION_GAP / 2} />
      ) : null}

      {showMembers ? (
        <View style={styles.section}>
          <OxText style={[styles.sectionLabel, { color: colors.inkSoft }]}>
            Dining with
          </OxText>
          <View style={styles.memberAvatars}>
            {memberUsers.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => openProfile(router, m.id, currentUser?.id)}
                style={styles.memberAvatar}
              >
                <Avatar avatar={m.avatar} name={m.name} size={40} />
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: SECTION_GAP,
  },
  college: {
    fontSize: DISPLAY_HERO,
    textTransform: "uppercase",
    lineHeight: DISPLAY_HERO + 4,
  },
  meta: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: -SECTION_GAP / 2,
  },
  headerTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
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
  hostRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  hostText: {
    flex: 1,
    minWidth: 0,
  },
  hostName: {
    fontSize: 22,
    marginBottom: 4,
  },
  hostMeta: {
    fontSize: 15,
    lineHeight: 20,
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  memberAvatars: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  memberAvatar: {
    marginRight: 4,
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
  },
});
