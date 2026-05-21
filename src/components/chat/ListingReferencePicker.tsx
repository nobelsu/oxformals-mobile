import { ListingReferenceCard } from "@/src/components/chat/ListingReferenceCard";
import { OxModal } from "@/src/components/ui/OxModal";
import { OxText } from "@/src/components/ui/OxText";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { space } from "@/src/constants/spacing";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { ListingSummary } from "@/src/lib/chat/types";
import { useQuery } from "convex/react";
import { StyleSheet, View } from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
  conversationId: Id<"conversations">;
  onSelect: (listing: ListingSummary) => void;
};

export function ListingReferencePicker({
  visible,
  onClose,
  conversationId,
  onSelect,
}: Props) {
  const { colors } = useOxTheme();
  const listings = useQuery(
    api.chat.listReferableListings,
    visible ? { conversationId } : "skip",
  );

  function handleSelect(listing: ListingSummary) {
    onSelect(listing);
    onClose();
  }

  return (
    <OxModal
      visible={visible}
      onClose={onClose}
      title="Refer to a listing"
      scrollable
    >
      <OxText style={[styles.subtitle, { color: colors.inkMuted }]}>
        Attach a formal listing to your message.
      </OxText>
      <View style={styles.list}>
        {listings === undefined ? (
          <OxText style={{ color: colors.inkSoft }}>Loading…</OxText>
        ) : listings.length === 0 ? (
          <OxText style={{ color: colors.inkSoft }}>No listings available.</OxText>
        ) : (
          listings.map((listing) => (
            <ListingReferenceCard
              key={listing.id}
              listing={listing}
              compact
              onPress={() => handleSelect(listing)}
            />
          ))
        )}
      </View>
    </OxModal>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    marginBottom: space[4],
  },
  list: {
    gap: space[2],
    paddingBottom: space[2],
  },
});
