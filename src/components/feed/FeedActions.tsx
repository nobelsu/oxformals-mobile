import { api } from "@/convex/_generated/api";
import type { FeedItem } from "@/src/components/feed/types";
import { OxText } from "@/src/components/ui/OxText";
import { useAuth } from "@/src/components/auth/useAuth";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { errorMessage } from "@/src/lib/errorMessage";
import {
  listingShareTarget,
  openShareMenu,
  reviewShareTarget,
  type ShareTarget,
} from "@/src/lib/share/share";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

type Props = {
  item: FeedItem;
  college: string;
  onOpenComments: (item: FeedItem) => void;
};

type IconName = React.ComponentProps<typeof Ionicons>["name"];

function ActionButton({
  icon,
  label,
  count,
  active,
  disabled,
  onPress,
}: {
  icon: IconName;
  label: string;
  count?: number;
  active?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors } = useOxTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={[styles.action, disabled && styles.busy]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active, disabled: !!disabled }}
    >
      <Ionicons name={icon} size={21} color={active ? colors.danger : colors.ink} />
      {count ? (
        <OxText style={[styles.count, { color: colors.inkMuted }]}>{count}</OxText>
      ) : null}
    </Pressable>
  );
}

/** A listing can be shared by anyone; a review only by whoever wrote it. */
function shareTargetFor(item: FeedItem, viewerId: string | undefined): ShareTarget | null {
  const id = item.key.slice(item.key.indexOf(":") + 1);
  if (item.kind === "listing") {
    return listingShareTarget({
      id,
      college: item.listing.college,
      dateTime: item.listing.dateTime,
    });
  }
  if (item.kind === "review" && viewerId && item.actor._id === viewerId) {
    return reviewShareTarget(id, item.college);
  }
  return null;
}

/** Like, comment, share, save and "add this college to my wishlist". */
export function FeedActions({ item, college, onOpenComments }: Props) {
  const { user } = useAuth();
  const [sharing, setSharing] = useState(false);
  const shareTarget = shareTargetFor(item, user?.id);
  const toggleLike = useMutation(api.feedLikes.toggleLike);
  const toggleBookmark = useMutation(api.feedBookmarks.toggleBookmark);
  const toggleWishlist = useMutation(api.users.toggleWishlistCollege);

  const run = (action: Promise<unknown>) => {
    void Haptics.selectionAsync();
    action.catch((error) => Alert.alert("Couldn't do that", errorMessage(error)));
  };

  return (
    <View style={styles.row}>
      <ActionButton
        icon={item.viewerLiked ? "heart" : "heart-outline"}
        label={item.viewerLiked ? "Unlike" : "Like"}
        count={item.likeCount}
        active={item.viewerLiked}
        onPress={() => run(toggleLike({ targetKey: item.key }))}
      />
      <ActionButton
        icon="chatbubble-outline"
        label="Comments"
        count={item.commentCount}
        onPress={() => onOpenComments(item)}
      />
      <View style={styles.spacer} />
      {shareTarget ? (
        <ActionButton
          icon="share-outline"
          label="Share"
          disabled={sharing}
          onPress={() => openShareMenu(shareTarget, setSharing)}
        />
      ) : null}
      <ActionButton
        icon={item.onWishlist ? "star" : "star-outline"}
        label={
          item.onWishlist
            ? `Remove ${college} from your wishlist`
            : `Add ${college} to your wishlist`
        }
        active={item.onWishlist}
        onPress={() => run(toggleWishlist({ college }))}
      />
      <ActionButton
        icon={item.viewerBookmarked ? "bookmark" : "bookmark-outline"}
        label={item.viewerBookmarked ? "Remove from saved" : "Save"}
        active={item.viewerBookmarked}
        onPress={() => run(toggleBookmark({ targetKey: item.key }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    marginTop: 14,
  },
  spacer: { flex: 1 },
  action: { flexDirection: "row", alignItems: "center", gap: 5, minHeight: 28 },
  busy: { opacity: 0.4 },
  count: { fontSize: 14 },
});
