import { chatText } from "@/src/components/chat/chatText";
import { ListingReferenceCard } from "@/src/components/chat/ListingReferenceCard";
import { MessageBody } from "@/src/components/chat/MessageBody";
import { MessageReplyQuote } from "@/src/components/chat/MessageReplyQuote";
import { SwipeToReplyMessage } from "@/src/components/chat/SwipeToReplyMessage";
import { BUBBLE_PADDING, DoodleBubble, messageSeed } from "@/src/components/ui/DoodleBubble";
import { chatBubbleMaxWidth } from "@/src/constants/layout";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { formatRelativeTime } from "@/src/lib/data/format";
import { replySnapshotSenderLabel } from "@/src/lib/chat/replyPreview";
import type { ChatMessage, ConversationPreview } from "@/src/lib/chat/types";
import { isGroupConversation } from "@/src/lib/chat/types";
import type { Id } from "@/convex/_generated/dataModel";
import { useCallback } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

type Props = {
  message: ChatMessage;
  conversation: ConversationPreview;
  currentUserId?: Id<"users">;
  keyboardVisible?: boolean;
  onReply: (message: ChatMessage) => void;
  onListingPress?: (listingId: Id<"listings">) => void;
};

export function ChatMessageRow({
  message,
  conversation,
  currentUserId,
  keyboardVisible = false,
  onReply,
  onListingPress,
}: Props) {
  const { colors } = useOxTheme();
  const { width: windowWidth } = useWindowDimensions();
  const mine = message.senderUserId === currentUserId;
  const bubbleMaxWidth = chatBubbleMaxWidth(windowWidth);
  const bodyMaxWidth = bubbleMaxWidth - BUBBLE_PADDING * 2;
  const isGroup = isGroupConversation(conversation);

  const handleReply = useCallback(() => {
    onReply(message);
  }, [message, onReply]);

  const handleListingPress = useCallback(
    (listingId: Id<"listings">) => {
      onListingPress?.(listingId);
    },
    [onListingPress],
  );

  const replySenderLabel = message.replyTo
    ? replySnapshotSenderLabel(message.replyTo, currentUserId)
    : "";

  return (
    <View
      style={[
        styles.row,
        { justifyContent: mine ? "flex-end" : "flex-start" },
      ]}
    >
      <View style={[styles.bubbleSlot, { maxWidth: bubbleMaxWidth }]}>
        <SwipeToReplyMessage
          onReply={handleReply}
          keyboardVisible={keyboardVisible}
        >
          <Pressable
            onLongPress={handleReply}
            delayLongPress={400}
            accessibilityHint="Long press to reply"
          >
            <DoodleBubble seed={messageSeed(message.id)} mine={mine}>
              {!mine && isGroup && message.senderName ? (
                <Text
                  style={[chatText, { color: colors.inkSoft, fontSize: 11 }]}
                >
                  {message.senderName}
                </Text>
              ) : null}
              {message.replyTo ? (
                <MessageReplyQuote
                  reply={message.replyTo}
                  senderLabel={replySenderLabel}
                  isMine={mine}
                  maxLayoutWidth={bodyMaxWidth}
                  onListingPress={
                    onListingPress ? handleListingPress : undefined
                  }
                />
              ) : null}
              {message.body ? (
                <MessageBody
                  body={message.body}
                  mentions={message.mentions}
                  isMine={mine}
                  currentUserId={currentUserId}
                  maxLayoutWidth={bodyMaxWidth}
                />
              ) : null}
              {message.referencedListing ? (
                <View style={message.body ? styles.listingGap : undefined}>
                  <ListingReferenceCard
                    listing={message.referencedListing}
                    compact
                    onPress={
                      onListingPress
                        ? () =>
                            handleListingPress(message.referencedListing!.id)
                        : undefined
                    }
                  />
                </View>
              ) : null}
              <Text
                style={[
                  chatText,
                  { color: colors.inkSoft, fontSize: 10, marginTop: 4 },
                ]}
              >
                {formatRelativeTime(message.createdAt)}
              </Text>
            </DoodleBubble>
          </Pressable>
        </SwipeToReplyMessage>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: "100%",
    flexDirection: "row",
    marginBottom: 10,
  },
  bubbleSlot: {
    flexShrink: 1,
  },
  listingGap: {
    marginTop: 8,
  },
});
