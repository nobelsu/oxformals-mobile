import { api } from "@/convex/_generated/api";
import type { FeedItem } from "@/src/components/feed/types";
import { OxText } from "@/src/components/ui/OxText";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { errorMessage } from "@/src/lib/errorMessage";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import * as Haptics from "expo-haptics";
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
  onPress,
}: {
  icon: IconName;
  label: string;
  count?: number;
  active?: boolean;
  onPress: () => void;
}) {
  const { colors } = useOxTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={styles.action}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}
    >
      <Ionicons name={icon} size={21} color={active ? colors.danger : colors.ink} />
      {count ? (
        <OxText style={[styles.count, { color: colors.inkMuted }]}>{count}</OxText>
      ) : null}
    </Pressable>
  );
}

/** Like, comment, save and "add this college to my wishlist". */
export function FeedActions({ item, college, onOpenComments }: Props) {
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
  count: { fontSize: 14 },
});
