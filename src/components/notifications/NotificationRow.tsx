import { api } from "@/convex/_generated/api";
import { useData } from "@/src/components/data/useData";
import { partyWaitingReason } from "@/src/components/swap/RequestPartyNote";
import { Avatar } from "@/src/components/ui/Avatar";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxText } from "@/src/components/ui/OxText";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { formatRelativeTime } from "@/src/lib/data/format";
import { errorMessage } from "@/src/lib/errorMessage";
import { notificationHref } from "@/src/lib/push/notificationHref";
import type { FunctionReturnType } from "convex/server";
import { useMutation } from "convex/react";
import { type Href, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

export type NotificationItem = FunctionReturnType<
  typeof api.notifications.listMyNotifications
>["page"][number];

/** One line of the inbox: who, what, when, and an answer where one is wanted. */
export function NotificationRow({ item }: { item: NotificationItem }) {
  const { colors } = useOxTheme();
  const router = useRouter();
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
        {/* One font weight: bold segments are inked, the rest muted. */}
        <OxText style={[styles.body, { color: colors.inkMuted }]}>
          {item.segments.map((s, i) =>
            s.bold ? (
              <OxText key={i} style={{ color: colors.ink }}>
                {s.text}
              </OxText>
            ) : (
              s.text
            ),
          )}
        </OxText>
        <OxText style={[styles.when, { color: colors.inkSoft }]}>
          {formatRelativeTime(item.createdAt)}
        </OxText>
        {item.action?.type === "party" ? <PartyAnswer item={item} /> : null}
        {item.action?.type === "request" ? <RequestAnswer item={item} /> : null}
      </View>
      {unread ? (
        <View
          style={[styles.dot, { backgroundColor: colors.danger }]}
          accessibilityLabel="New"
        />
      ) : null}
    </Pressable>
  );
}

function Resolved({ text }: { text: string }) {
  const { colors } = useOxTheme();
  return <OxText style={[styles.resolved, { color: colors.inkMuted }]}>{text}</OxText>;
}

/** A friend put you in their group: "I'm in" or "Not me". */
function PartyAnswer({ item }: { item: NotificationItem }) {
  const respond = useMutation(api.partyInvites.respondToPartyInvite);
  const [busy, setBusy] = useState<"in" | "out" | null>(null);
  const { action, requestId } = item;
  if (action?.type !== "party" || !requestId) return null;
  if (action.state === "in") return <Resolved text="You're in." />;
  if (action.state === "out") return <Resolved text="You said not me." />;
  if (action.state !== "pending") return null;

  async function answer(response: "in" | "out") {
    if (!requestId) return;
    setBusy(response);
    try {
      await respond({ requestId, response });
    } catch (error) {
      Alert.alert("Couldn't send that", errorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={styles.actions}>
      <OxButton
        title="I'm in"
        loading={busy === "in"}
        disabled={busy !== null}
        onPress={() => void answer("in")}
      />
      <OxButton
        title="Not me"
        variant="secondary"
        loading={busy === "out"}
        disabled={busy !== null}
        onPress={() => void answer("out")}
      />
    </View>
  );
}

/** Someone asked to join your formal: accept or decline, as on the request screens. */
function RequestAnswer({ item }: { item: NotificationItem }) {
  const { colors } = useOxTheme();
  const { requests, getUser, acceptRequest, declineRequest } = useData();
  const [sent, setSent] = useState(false);
  const { action, requestId } = item;
  const state = action?.type === "request" ? action.state : null;

  // The data layer reports a failure itself; let the buttons be tried again.
  useEffect(() => {
    if (!sent) return;
    const timer = setTimeout(() => setSent(false), 5000);
    return () => clearTimeout(timer);
  }, [sent]);

  if (state === "accepted") return <Resolved text="Accepted." />;
  if (state === "declined") return <Resolved text="Declined." />;
  // A withdrawn request is deleted, so the backend reports it as gone.
  if (state === "gone") return <Resolved text="Withdrawn." />;
  if (state !== "pending" || !requestId) return null;

  const request = requests.find((r) => r.id === requestId);
  if (!request || request.status !== "pending") return null;
  // A group request can't be accepted until everyone in it is ready.
  const waiting = partyWaitingReason(request, (id) => getUser(id)?.name);

  return (
    <>
      <View style={styles.actions}>
        <OxButton
          title="Accept"
          disabled={sent || waiting !== null}
          onPress={() => {
            if (acceptRequest(request.id)) setSent(true);
          }}
        />
        <OxButton
          title="Decline"
          variant="secondary"
          disabled={sent}
          onPress={() => {
            setSent(true);
            declineRequest(request.id);
          }}
        />
      </View>
      {waiting ? (
        <OxText style={[styles.resolved, { color: colors.danger }]}>{waiting}</OxText>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 12 },
  text: { flex: 1 },
  body: { fontSize: 16, lineHeight: 21 },
  when: { fontSize: 12, marginTop: 2 },
  actions: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  resolved: { fontSize: 13, marginTop: 6 },
  dot: { width: 9, height: 9, borderRadius: 5, marginTop: 7 },
});
