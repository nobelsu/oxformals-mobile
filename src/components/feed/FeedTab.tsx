import { api } from "@/convex/_generated/api";
import { useAuth } from "@/src/components/auth/useAuth";
import { FeedCard } from "@/src/components/feed/FeedCard";
import { FeedCommentsSheet } from "@/src/components/feed/FeedCommentsSheet";
import { PartyInvites } from "@/src/components/feed/PartyInvites";
import { PeopleYouMayKnow } from "@/src/components/feed/PeopleYouMayKnow";
import type { FeedItem, FeedScope } from "@/src/components/feed/types";
import { WeekFormals } from "@/src/components/feed/WeekFormals";
import { YourFormalsCard } from "@/src/components/feed/YourFormalsCard";
import { Chip } from "@/src/components/ui/Chip";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxLoadingView } from "@/src/components/ui/OxLoadingView";
import { OxText } from "@/src/components/ui/OxText";
import {
  CARD_GAP,
  SCREEN_PADDING,
  TAB_SCREEN_EDGES,
  TAB_SCROLL_EXTRA_BOTTOM,
} from "@/src/constants/layout";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SCOPES: { id: FeedScope; label: string }[] = [
  { id: "forYou", label: "For you" },
  { id: "following", label: "Following" },
];

export function FeedTab() {
  const { colors } = useOxTheme();
  const { user } = useAuth();
  const router = useRouter();
  const bell = useQuery(api.notifications.getBellState, user ? {} : "skip");
  const [scope, setScope] = useState<FeedScope>("forYou");
  const feed = useQuery(api.feed.getCampusFeed, user ? { scope } : "skip");
  // Keyed by item so the sheet follows live like and comment counts.
  const [commentsKey, setCommentsKey] = useState<string | null>(null);
  const openComments = useCallback((item: FeedItem) => setCommentsKey(item.key), []);
  const commentsItem =
    feed?.items.find((item) => item.key === commentsKey) ?? null;

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => (
      <FeedCard item={item} onOpenComments={openComments} />
    ),
    [openComments],
  );

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.bg }]}
      edges={TAB_SCREEN_EDGES}
    >
      <FlatList
        data={feed?.items ?? []}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={Separator}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.top}>
              <OxText
                style={[styles.wordmark, { color: colors.ink }]}
                accessibilityRole="header"
              >
                oxformals
              </OxText>
              <Pressable
                onPress={() => router.push("/search")}
                hitSlop={8}
                style={styles.icon}
                accessibilityRole="button"
                accessibilityLabel="Find people"
              >
                <Ionicons name="search-outline" size={24} color={colors.ink} />
              </Pressable>
              <Pressable
                onPress={() => router.push("/notifications")}
                hitSlop={8}
                style={styles.icon}
                accessibilityRole="button"
                accessibilityLabel={
                  bell?.unread ? `Notifications, ${bell.unread} new` : "Notifications"
                }
              >
                <Ionicons name="notifications-outline" size={24} color={colors.ink} />
                {bell?.unread ? (
                  <View style={[styles.badge, { backgroundColor: colors.danger }]} />
                ) : null}
              </Pressable>
            </View>
            {user ? <WeekFormals /> : null}
            <PartyInvites />
            <YourFormalsCard />
            <View style={styles.scopes}>
              {SCOPES.map((s) => (
                <Chip
                  key={s.id}
                  label={s.label}
                  selected={scope === s.id}
                  onPress={() => setScope(s.id)}
                />
              ))}
            </View>
            {scope === "following" ? <PeopleYouMayKnow /> : null}
            {scope === "forYou" && feed?.wishlistEmpty ? (
              <View style={styles.nudge}>
                <OxText style={[styles.nudgeText, { color: colors.ink }]}>
                  Pick colleges you want to go to
                </OxText>
                <OxButton
                  title="Choose"
                  variant="secondary"
                  onPress={() => router.push("/colleges")}
                />
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          feed === undefined ? (
            <OxLoadingView style={styles.loading} />
          ) : (
            <OxText style={[styles.empty, { color: colors.inkMuted }]}>
              {scope === "following"
                ? "Nothing from people you follow yet."
                : "Nothing here yet."}
            </OxText>
          )
        }
      />
      <FeedCommentsSheet item={commentsItem} onClose={() => setCommentsKey(null)} />
    </SafeAreaView>
  );
}

function Separator() {
  return <View style={{ height: CARD_GAP + 4 }} />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: TAB_SCROLL_EXTRA_BOTTOM + 32,
  },
  header: { gap: 14, paddingBottom: 14, paddingTop: 4 },
  top: { flexDirection: "row", alignItems: "center", gap: 6 },
  wordmark: { fontSize: 32, lineHeight: 38, flex: 1 },
  icon: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: 7, right: 8, width: 9, height: 9, borderRadius: 5 },
  scopes: { flexDirection: "row", gap: 8 },
  nudge: { flexDirection: "row", alignItems: "center", gap: 12 },
  nudgeText: { flex: 1, fontSize: 16, lineHeight: 20 },
  loading: { paddingVertical: 48 },
  empty: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
    paddingVertical: 40,
    paddingHorizontal: 12,
  },
});
