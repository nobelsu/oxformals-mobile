import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { MAX_FEED_COMMENT_LENGTH } from "@/lib/data/feedConstants";
import type { FeedItem } from "@/src/components/feed/types";
import { Avatar } from "@/src/components/ui/Avatar";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxInput } from "@/src/components/ui/OxInput";
import { OxModal } from "@/src/components/ui/OxModal";
import { OxSpinner } from "@/src/components/ui/OxSpinner";
import { OxText } from "@/src/components/ui/OxText";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { formatRelativeTime } from "@/src/lib/data/format";
import { errorMessage } from "@/src/lib/errorMessage";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

type Props = {
  /** The item whose thread is open, or null when closed. */
  item: FeedItem | null;
  onClose: () => void;
};

export function FeedCommentsSheet({ item, onClose }: Props) {
  const { colors } = useOxTheme();
  const comments = useQuery(
    api.feedComments.listComments,
    item ? { targetKey: item.key } : "skip",
  );
  const addComment = useMutation(api.feedComments.addComment);
  const deleteComment = useMutation(api.feedComments.deleteComment);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    const body = text.trim();
    if (!item || !body || sending) return;
    setSending(true);
    try {
      await addComment({ targetKey: item.key, text: body });
      setText("");
    } catch (error) {
      Alert.alert("Couldn't post your comment", errorMessage(error));
    } finally {
      setSending(false);
    }
  }

  function confirmDelete(commentId: Id<"feedComments">) {
    Alert.alert("Delete this comment?", undefined, [
      { text: "Keep it", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteComment({ commentId }).catch((error) =>
            Alert.alert("Couldn't delete it", errorMessage(error)),
          );
        },
      },
    ]);
  }

  return (
    <OxModal visible={item !== null} onClose={onClose} title="Comments">
      {comments === undefined ? (
        <View style={styles.center}>
          <OxSpinner />
        </View>
      ) : comments.length === 0 ? (
        <OxText style={[styles.empty, { color: colors.inkMuted }]}>
          No comments yet. Say something nice.
        </OxText>
      ) : (
        <View style={styles.list}>
          {comments.map((c) => (
            <View key={c.id} style={styles.comment}>
              <Avatar
                avatar={c.author?.avatar}
                name={c.author?.name ?? "?"}
                size={30}
              />
              <View style={styles.commentBody}>
                <OxText style={[styles.author, { color: colors.ink }]}>
                  {c.author?.name ?? "Someone"}
                  <OxText style={{ color: colors.inkSoft }}>
                    {"  "}
                    {formatRelativeTime(c.ts)}
                  </OxText>
                </OxText>
                <OxText style={[styles.commentText, { color: colors.ink }]}>
                  {c.text}
                </OxText>
              </View>
              {c.isMine ? (
                <Pressable
                  onPress={() => confirmDelete(c.id)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Delete your comment"
                >
                  <Ionicons name="trash-outline" size={17} color={colors.inkSoft} />
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      )}
      <View style={styles.composer}>
        <OxInput
          value={text}
          onChangeText={setText}
          placeholder="Add a comment"
          maxLength={MAX_FEED_COMMENT_LENGTH}
          multiline
          compact
          wrapperStyle={styles.input}
        />
        <OxButton
          title="Post"
          onPress={() => void send()}
          loading={sending}
          disabled={!text.trim()}
        />
      </View>
    </OxModal>
  );
}

const styles = StyleSheet.create({
  center: { paddingVertical: 24, alignItems: "center" },
  empty: { fontSize: 15, paddingVertical: 16, textAlign: "center" },
  list: { gap: 14, paddingVertical: 4 },
  comment: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  commentBody: { flex: 1 },
  author: { fontSize: 14 },
  commentText: { fontSize: 15, lineHeight: 20, marginTop: 1 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginTop: 16,
  },
  input: { flex: 1 },
});
