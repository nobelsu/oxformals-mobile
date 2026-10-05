import { api } from "@/convex/_generated/api";
import { NotificationRow } from "@/src/components/notifications/NotificationRow";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxLoadingView } from "@/src/components/ui/OxLoadingView";
import { OxText } from "@/src/components/ui/OxText";
import { SCREEN_PADDING } from "@/src/constants/layout";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { useMutation, usePaginatedQuery } from "convex/react";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { FlatList, StyleSheet, View } from "react-native";

const PAGE_SIZE = 30;

/** Everything that's happened to you: requests, invites, follows, credits. */
export default function NotificationsScreen() {
  const { colors } = useOxTheme();
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
          renderItem={({ item }) => <NotificationRow item={item} />}
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
  rule: { height: StyleSheet.hairlineWidth, opacity: 0.5 },
  empty: { fontSize: 16, textAlign: "center", paddingVertical: 48 },
  more: { marginTop: 16, alignSelf: "center" },
});
