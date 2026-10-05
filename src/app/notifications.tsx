import { api } from "@/convex/_generated/api";
import { Avatar } from "@/src/components/ui/Avatar";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxLoadingView } from "@/src/components/ui/OxLoadingView";
import { OxText } from "@/src/components/ui/OxText";
import { SCREEN_PADDING } from "@/src/constants/layout";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { formatRelativeTime } from "@/src/lib/data/format";
import { notificationHref } from "@/src/lib/push/notificationHref";
import { useMutation, usePaginatedQuery } from "convex/react";
import { type Href, Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";

const PAGE_SIZE = 30;

/** Everything that's happened to you: requests, invites, follows, credits. */
export default function NotificationsScreen() {
  const { colors } = useOxTheme();
  const router = useRouter();
  const { results, status, loadMore } = usePaginatedQuery(
    api.notifications.listMyNotifications,
    {},
    { initialNumItems: PAGE_SIZE },
  );
  const markAllRead = useMutation(api.notifications.markAllRead);

  // Opening the inbox reads everything, as on the website.
  useEffect(() => {
    if (status === "LoadingFirstPage") return;
    markAllRead({}).catch(() => {});
  }, [status === "LoadingFirstPage", markAllRead]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Stack.Screen options={{ title: "Notifications", headerShown: true }} />
      {status === "LoadingFirstPage" ? (
        <OxLoadingView fill />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(n) => n._id}
          style={{ backgroundColor: colors.bg }}
          contentContainerStyle={styles.content}
          ItemSeparatorComponent={() => (
            <View style={[styles.rule, { backgroundColor: colors.inkSoft }]} />
          )}
          renderItem={({ item }) => {
            const href = notificationHref(item.url);
            const unread = item.readAt === undefined;
            return (
              <Pressable
                onPress={href ? () => router.push(href as Href) : undefined}
                style={styles.row}
                accessibilityRole="button"
              >
                <Avatar
                  avatar={item.actor?.avatar ?? undefined}
                  name={item.actor?.name ?? "Oxformals"}
                  size={38}
                />
                <View style={styles.text}>
                  <OxText style={[styles.body, { color: colors.ink }]}>
                    {item.segments.map((s) => s.text).join("")}
                  </OxText>
                  <OxText style={[styles.when, { color: colors.inkSoft }]}>
                    {formatRelativeTime(item.createdAt)}
                  </OxText>
                </View>
                {unread ? (
                  <View
                    style={[styles.dot, { backgroundColor: colors.danger }]}
                    accessibilityLabel="New"
                  />
                ) : null}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <OxText style={[styles.empty, { color: colors.inkMuted }]}>
              Nothing yet.
            </OxText>
          }
          ListFooterComponent={
            status === "CanLoadMore" ? (
              <OxButton
                title="Show older"
                variant="secondary"
                onPress={() => loadMore(PAGE_SIZE)}
                style={styles.more}
              />
            ) : null
          }
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: SCREEN_PADDING, paddingBottom: 48 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 12 },
  text: { flex: 1 },
  body: { fontSize: 16, lineHeight: 21 },
  when: { fontSize: 12, marginTop: 2 },
  dot: { width: 9, height: 9, borderRadius: 5, marginTop: 7 },
  rule: { height: StyleSheet.hairlineWidth, opacity: 0.5 },
  empty: { fontSize: 16, textAlign: "center", paddingVertical: 48 },
  more: { marginTop: 16, alignSelf: "center" },
});
