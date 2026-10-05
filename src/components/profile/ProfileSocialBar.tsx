import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ReportSheet } from "@/src/components/report/ReportSheet";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxText } from "@/src/components/ui/OxText";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { chatConversationHref } from "@/src/lib/chat/navigation";
import { errorMessage } from "@/src/lib/errorMessage";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActionSheetIOS, Alert, Platform, Pressable, StyleSheet, View } from "react-native";

type Props = {
  userId: Id<"users">;
  name: string;
};

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Follow, message and block for someone else's profile, with their follower
 * counts and a note when the account is private or blocked.
 */
export function ProfileSocialBar({ userId, name }: Props) {
  const { colors } = useOxTheme();
  const router = useRouter();
  const state = useQuery(api.follows.getFollowState, { userId });
  const blockState = useQuery(api.blocks.getBlockState, { userId });
  const follow = useMutation(api.follows.follow);
  const unfollow = useMutation(api.follows.unfollow);
  const block = useMutation(api.blocks.block);
  const unblock = useMutation(api.blocks.unblock);
  const getOrCreateConversation = useMutation(api.chat.getOrCreateConversation);
  const [busy, setBusy] = useState(false);
  const [reporting, setReporting] = useState(false);

  if (!state || !blockState || state.isSelf) return null;

  const firstName = name.trim().split(" ")[0] || "them";

  async function run(action: () => Promise<unknown>, failure: string) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } catch (error) {
      Alert.alert(failure, errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function confirmBlock() {
    Alert.alert(
      `Block ${firstName}?`,
      "You won't see or hear from each other. They aren't told.",
      [
        { text: "Not now", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: () => void run(() => block({ userId }), "Couldn't block them"),
        },
      ],
    );
  }

  function openMore() {
    const blockLabel = blockState?.iBlocked ? `Unblock ${firstName}` : `Block ${firstName}`;
    const onBlock = () =>
      blockState?.iBlocked
        ? void run(() => unblock({ userId }), "Couldn't unblock them")
        : confirmBlock();
    const reportLabel = `Report ${firstName}`;
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [reportLabel, blockLabel, "Cancel"],
          destructiveButtonIndex: blockState?.iBlocked ? 0 : [0, 1],
          cancelButtonIndex: 2,
        },
        (index) => {
          if (index === 0) setReporting(true);
          if (index === 1) onBlock();
        },
      );
    } else {
      Alert.alert(name, undefined, [
        { text: reportLabel, onPress: () => setReporting(true) },
        { text: blockLabel, style: "destructive", onPress: onBlock },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  }

  const blocked = blockState.iBlocked || blockState.blockedMe;
  const followTitle =
    state.following === "active"
      ? "Following"
      : state.following === "pending"
        ? "Requested"
        : state.followsYou
          ? "Follow back"
          : "Follow";

  return (
    <View style={styles.wrap}>
      <OxText style={[styles.counts, { color: colors.inkMuted }]}>
        {plural(state.followers, "follower", "followers")} · {state.followingCount}{" "}
        following
        {state.followsYou ? " · Follows you" : ""}
      </OxText>

      {blocked ? (
        <View style={styles.row}>
          <OxText style={[styles.note, { color: colors.inkMuted }]}>
            {blockState.iBlocked
              ? `You've blocked ${firstName}.`
              : "You can't interact with this account."}
          </OxText>
          {blockState.iBlocked ? (
            <OxButton
              title="Unblock"
              variant="secondary"
              loading={busy}
              onPress={() => void run(() => unblock({ userId }), "Couldn't unblock them")}
            />
          ) : null}
        </View>
      ) : (
        <View style={styles.row}>
          <OxButton
            title={followTitle}
            variant={state.following === "none" ? "primary" : "secondary"}
            loading={busy}
            style={styles.grow}
            onPress={() => {
              if (state.following === "none") {
                void run(() => follow({ userId }), "Couldn't follow them");
              } else if (state.following === "pending") {
                void run(() => unfollow({ userId }), "Couldn't cancel your request");
              } else {
                Alert.alert(`Unfollow ${firstName}?`, undefined, [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Unfollow",
                    style: "destructive",
                    onPress: () =>
                      void run(() => unfollow({ userId }), "Couldn't unfollow them"),
                  },
                ]);
              }
            }}
          />
          <OxButton
            title="Message"
            variant="secondary"
            style={styles.grow}
            onPress={() =>
              void run(async () => {
                const id = await getOrCreateConversation({ otherUserId: userId });
                router.push(chatConversationHref(id));
              }, "Couldn't open this chat")
            }
          />
          <Pressable
            onPress={openMore}
            hitSlop={8}
            style={styles.more}
            accessibilityRole="button"
            accessibilityLabel="More options"
          >
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.ink} />
          </Pressable>
        </View>
      )}

      <ReportSheet
        target={reporting ? { kind: "user", userId } : null}
        subject={firstName}
        onClose={() => setReporting(false)}
      />

      {!blocked && state.isPrivate && !state.canSeeActivity ? (
        <View style={styles.private}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.inkMuted} />
          <OxText style={[styles.note, { color: colors.inkMuted }]}>
            This account is private.
          </OxText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 16, gap: 12 },
  counts: { fontSize: 15, textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  grow: { flex: 1 },
  more: { width: 40, height: 44, alignItems: "center", justifyContent: "center" },
  note: { fontSize: 15, lineHeight: 20, flex: 1 },
  private: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
});
