import { chatText } from "@/src/components/chat/chatText";
import { ListingTypeTag } from "@/src/components/ui/ListingTypeTag";
import { SketchCard } from "@/src/components/ui/SketchCard";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import {
  formatListingDate,
  formatListingStatusLabel,
  formatPrice,
} from "@/src/lib/data/format";
import type { ListingSummary } from "@/src/lib/chat/types";
import { sketchSeedFrom } from "@/src/lib/ui/sketchStroke";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  listing: ListingSummary;
  onPress?: () => void;
  compact?: boolean;
};

export function ListingReferenceCard({
  listing,
  onPress,
  compact = true,
}: Props) {
  const { colors } = useOxTheme();
  const statusLabel = formatListingStatusLabel(
    listing.status,
    listing.seatsAvailable,
  );

  const inner = (
    <>
      <View style={styles.titleRow}>
        <Text
          style={[
            chatText,
            styles.college,
            { color: colors.ink, fontFamily: FONT_DISPLAY },
          ]}
          numberOfLines={1}
        >
          {listing.college.toUpperCase()}
        </Text>
        {listing.listingType ? (
          <ListingTypeTag listingType={listing.listingType} />
        ) : null}
        <Text style={[chatText, styles.status, { color: colors.inkMuted }]}>
          {statusLabel}
        </Text>
      </View>
      <Text
        style={[chatText, styles.meta, { color: colors.inkMuted }]}
        numberOfLines={2}
      >
        {listing.ownerName}
        {" · "}
        {formatListingDate(listing.dateTime)}
        {listing.price !== undefined ? ` · ${formatPrice(listing.price)}` : ""}
      </Text>
    </>
  );

  const card = (
    <SketchCard
      seed={sketchSeedFrom(listing.id)}
      padding={compact ? 10 : 12}
      style={styles.card}
    >
      {inner}
    </SketchCard>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
      >
        {card}
      </Pressable>
    );
  }

  return card;
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
  },
  titleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  college: {
    fontSize: 14,
    letterSpacing: 0.5,
  },
  status: {
    fontSize: 11,
  },
  meta: {
    fontSize: 12,
    marginTop: 4,
  },
});
