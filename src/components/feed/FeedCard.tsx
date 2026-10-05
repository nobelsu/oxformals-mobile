import { FeedActions } from "@/src/components/feed/FeedActions";
import { FeedListingStatus } from "@/src/components/feed/FeedListingStatus";
import { FeedPhotoViewer } from "@/src/components/feed/FeedPhotoViewer";
import type {
  FeedAttendedItem,
  FeedItem,
  FeedListingItem,
  FeedReviewItem,
} from "@/src/components/feed/types";
import { Avatar } from "@/src/components/ui/Avatar";
import { ListingTypeTag } from "@/src/components/ui/ListingTypeTag";
import { OxText } from "@/src/components/ui/OxText";
import { SketchCard } from "@/src/components/ui/SketchCard";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { collegeToSlug } from "@/lib/data/collegeSlug";
import {
  formatListingDate,
  formatListingSeatsLabel,
  formatPrice,
  formatRelativeTime,
} from "@/src/lib/data/format";
import { mapListing } from "@/src/lib/data/mapConvex";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { memo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

type Props = {
  item: FeedItem;
  onOpenComments: (item: FeedItem) => void;
};

function seedFrom(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

function firstName(name: string | undefined): string {
  return name?.trim().split(" ")[0] || "Someone";
}

/** "Sophia", "Sophia and Arthur", "Sophia, Arthur and 3 others". */
function attendeeNames(item: FeedAttendedItem): string {
  const names = item.actors.map((a) => firstName(a.name));
  if (names.length <= 1) return names[0] ?? "Someone";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  const others = item.attendeeCount - 2;
  return `${names[0]}, ${names[1]} and ${others} other${others === 1 ? "" : "s"}`;
}

export const FeedCard = memo(function FeedCard({ item, onOpenComments }: Props) {
  const { colors } = useOxTheme();
  const router = useRouter();
  const [photo, setPhoto] = useState<number | null>(null);
  const actor = item.kind === "attended" ? item.actors[0] : item.actor;
  const college = item.kind === "listing" ? item.listing.college : item.college;

  const openTarget = () => {
    if (item.kind === "listing") router.push(`/listing/${item.listing._id}`);
    else if (actor) router.push(`/profile/${actor._id}`);
  };
  // Reviews and attended formals lead to the college; a listing's name opens the listing.
  const openCollege =
    item.kind === "listing"
      ? undefined
      : () => router.push(`/college/${collegeToSlug(college)}`);

  return (
    // A near-zero tilt keeps feed cards level (0 would pick a seeded tilt).
    <SketchCard seed={seedFrom(item.key)} padding={14} tilt={0.001}>
      <Pressable
        onPress={actor ? () => router.push(`/profile/${actor._id}`) : undefined}
        style={styles.header}
        accessibilityRole="button"
        accessibilityLabel={`${firstName(actor?.name)}'s profile`}
      >
        <Avatar avatar={actor?.avatar} name={actor?.name ?? "?"} size={36} />
        <View style={styles.headerText}>
          <OxText style={[styles.who, { color: colors.ink }]} numberOfLines={2}>
            {item.kind === "attended"
              ? `${attendeeNames(item)} went to`
              : item.kind === "review"
                ? `${firstName(actor?.name)} reviewed`
                : `${firstName(actor?.name)} listed a formal`}
          </OxText>
          <OxText style={[styles.when, { color: colors.inkSoft }]}>
            {formatRelativeTime(item.ts)}
          </OxText>
        </View>
      </Pressable>

      <Pressable onPress={openTarget} accessibilityRole="button">
        <View style={styles.titleRow}>
          <OxText
            style={[styles.college, { color: colors.ink }]}
            onPress={openCollege}
            accessibilityRole={openCollege ? "link" : undefined}
          >
            {college}
          </OxText>
          {item.onWishlist ? (
            <View style={[styles.wishTag, { backgroundColor: colors.accent }]}>
              <OxText style={[styles.wishTagText, { color: colors.accentInk }]}>
                On your wishlist
              </OxText>
            </View>
          ) : null}
        </View>
        {item.kind === "listing" ? <ListingBody item={item} /> : null}
        {item.kind === "review" ? (
          <ReviewBody item={item} onOpenPhoto={setPhoto} />
        ) : null}
        {item.kind === "attended" ? (
          <OxText style={[styles.meta, { color: colors.inkMuted }]}>
            {formatListingDate(item.dateTime)} · {item.attendeeCount} went
          </OxText>
        ) : null}
      </Pressable>

      {item.kind === "review" ? (
        <FeedPhotoViewer
          urls={item.imageUrls}
          index={photo}
          onClose={() => setPhoto(null)}
        />
      ) : null}

      {item.kind === "listing" ? (
        <FeedListingStatus listing={mapListing(item.listing)} />
      ) : null}

      {item.commentPreview.length > 0 ? (
        <Pressable onPress={() => onOpenComments(item)} style={styles.preview}>
          {item.commentPreview.map((c, i) => (
            <OxText
              key={i}
              numberOfLines={2}
              style={[styles.previewLine, { color: colors.inkMuted }]}
            >
              <OxText style={{ color: colors.ink }}>{firstName(c.name)}</OxText>
              {"  "}
              {c.text}
            </OxText>
          ))}
        </Pressable>
      ) : null}

      <FeedActions item={item} college={college} onOpenComments={onOpenComments} />
    </SketchCard>
  );
});

function ListingBody({ item }: { item: FeedListingItem }) {
  const { colors } = useOxTheme();
  const listing = mapListing(item.listing);
  const meta = [
    formatListingDate(listing.dateTime),
    formatListingSeatsLabel(listing.seatsAvailable),
    listing.price !== undefined ? formatPrice(listing.price) : null,
  ].filter(Boolean);
  return (
    <View>
      <OxText style={[styles.meta, { color: colors.inkMuted }]}>
        {meta.join(" · ")}
      </OxText>
      {listing.message.trim() ? (
        <OxText numberOfLines={3} style={[styles.body, { color: colors.ink }]}>
          {listing.message.trim()}
        </OxText>
      ) : null}
      <View style={styles.tagRow}>
        <ListingTypeTag listingType={listing.listingType} />
      </View>
    </View>
  );
}

function ReviewBody({
  item,
  onOpenPhoto,
}: {
  item: FeedReviewItem;
  onOpenPhoto: (index: number) => void;
}) {
  const { colors } = useOxTheme();
  const overall = Math.round(item.ratings.overall);
  return (
    <View>
      <View
        style={styles.stars}
        accessible
        accessibilityLabel={`${overall} out of 5`}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <Ionicons
            key={n}
            name={n <= overall ? "star" : "star-outline"}
            size={16}
            color={n <= overall ? colors.ink : colors.inkSoft}
          />
        ))}
      </View>
      {item.comment ? (
        <OxText numberOfLines={5} style={[styles.body, { color: colors.ink }]}>
          {item.comment}
        </OxText>
      ) : null}
      {item.imageUrls.length > 0 ? (
        <View style={styles.photos}>
          {item.imageUrls.slice(0, 3).map((url, i) => (
            <Pressable
              key={url}
              onPress={() => onOpenPhoto(i)}
              style={styles.photoWrap}
              accessibilityRole="imagebutton"
              accessibilityLabel={`Photo ${i + 1} of ${item.imageUrls.length}`}
            >
              <Image
                source={{ uri: url }}
                style={[styles.photo, { borderColor: colors.ink }]}
                contentFit="cover"
                transition={150}
              />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerText: { flex: 1 },
  who: { fontSize: 15, lineHeight: 19 },
  when: { fontSize: 12, marginTop: 1 },
  titleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  college: { fontSize: 24, lineHeight: 28 },
  wishTag: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  wishTagText: { fontSize: 11 },
  meta: { fontSize: 14, marginTop: 2 },
  body: { fontSize: 15, lineHeight: 20, marginTop: 8 },
  tagRow: { flexDirection: "row", marginTop: 10 },
  stars: { flexDirection: "row", gap: 2, marginTop: 6 },
  photos: { flexDirection: "row", gap: 8, marginTop: 10 },
  photoWrap: { flex: 1 },
  photo: { aspectRatio: 1, borderRadius: 10, borderWidth: 1.5 },
  preview: { marginTop: 12, gap: 2 },
  previewLine: { fontSize: 13, lineHeight: 17 },
});
