import { chatText } from "@/src/components/chat/chatText";
import { GroupAvatarStack } from "@/src/components/chat/GroupAvatarStack";
import { Avatar } from "@/src/components/ui/Avatar";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { formatRelativeTime } from "@/src/lib/data/format";
import { conversationDisplayTitle } from "@/src/lib/chat/conversationList";
import type { ConversationPreview } from "@/src/lib/chat/types";
import { isGroupConversation } from "@/src/lib/chat/types";
import type { Id } from "@/convex/_generated/dataModel";
import { Pressable, StyleSheet, Text, View } from "react-native";

export const CONVERSATION_ROW_AVATAR_SIZE = 56;
export const CONVERSATION_ROW_GAP = 12;
/** Left inset for dividers so wavy lines align under the text column. */
export const CONVERSATION_ROW_TEXT_INSET =
  CONVERSATION_ROW_AVATAR_SIZE + CONVERSATION_ROW_GAP;

type Props = {
  conversation: ConversationPreview;
  viewerUserId?: string;
  onPress: () => void;
};

function conversationPreview(
  conversation: ConversationPreview,
  viewerUserId?: string,
): string {
  const body = conversation.lastMessageBody ?? "No messages yet";
  if (
    viewerUserId &&
    conversation.lastMessageSenderId === (viewerUserId as Id<"users">)
  ) {
    return `You: ${body}`;
  }
  return body;
}

export function ConversationListRow({
  conversation,
  viewerUserId,
  onPress,
}: Props) {
  const { colors } = useOxTheme();
  const title = conversationDisplayTitle(conversation);
  const preview = conversationPreview(conversation, viewerUserId);
  const hasUnread = conversation.unreadCount > 0;
  const showTime = conversation.lastMessageAt > 0;

  return (
    <Pressable onPress={onPress} style={styles.row}>
      {isGroupConversation(conversation) ? (
        <GroupAvatarStack
          members={conversation.memberPreview}
          memberCount={conversation.memberCount}
          size={CONVERSATION_ROW_AVATAR_SIZE}
        />
      ) : (
        <Avatar
          name={conversation.otherUserName}
          avatar={conversation.otherUserAvatar}
          size={CONVERSATION_ROW_AVATAR_SIZE}
        />
      )}
      <View style={styles.text}>
        <View style={styles.titleRow}>
          <Text
            style={[
              chatText,
              styles.name,
              {
                color: hasUnread ? colors.ink : colors.inkMuted,
                fontSize: hasUnread ? 17 : 16,
              },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {showTime ? (
            <Text
              style={[chatText, styles.time, { color: colors.inkSoft }]}
              numberOfLines={1}
            >
              {formatRelativeTime(conversation.lastMessageAt)}
            </Text>
          ) : null}
        </View>
        <View style={styles.previewRow}>
          <Text
            style={[
              chatText,
              styles.preview,
              { color: hasUnread ? colors.inkMuted : colors.inkSoft },
            ]}
            numberOfLines={1}
          >
            {preview}
          </Text>
          {hasUnread ? (
            <View style={[styles.badge, { backgroundColor: colors.danger }]}>
              <Text style={[chatText, styles.badgeText, { color: "#fff" }]}>
                {conversation.unreadCount > 99
                  ? "99+"
                  : conversation.unreadCount}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: CONVERSATION_ROW_GAP,
    paddingVertical: 11,
  },
  text: { flex: 1, minWidth: 0, gap: 2 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  name: { flex: 1 },
  time: { fontSize: 12, flexShrink: 0 },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  preview: { fontSize: 14, flex: 1 },
  badge: {
    borderRadius: 999,
    minWidth: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    flexShrink: 0,
  },
  badgeText: { fontSize: 11 },
});
