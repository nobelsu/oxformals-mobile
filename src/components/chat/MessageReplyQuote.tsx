import { chatText } from "@/src/components/chat/chatText";
import { SketchCard } from "@/src/components/ui/SketchCard";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import {
  formatReplyListingPreview,
  truncateReplyBody,
  UNAVAILABLE_LABEL,
} from "@/src/lib/chat/replyPreview";
import type { MessageReplySnapshot } from "@/src/lib/chat/types";
import type { Id } from "@/convex/_generated/dataModel";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  reply: MessageReplySnapshot;
  senderLabel: string;
  isMine?: boolean;
  variant?: "bubble" | "composer";
  /** Caps line width so quote text wraps inside the bubble. */
  maxLayoutWidth?: number;
  onListingPress?: (listingId: Id<"listings">) => void;
  onCancel?: () => void;
};

export function MessageReplyQuote({
  reply,
  senderLabel,
  isMine = false,
  variant = "bubble",
  maxLayoutWidth,
  onListingPress,
  onCancel,
}: Props) {
  const { colors } = useOxTheme();
  const isComposer = variant === "composer";
  const textWidthStyle =
    maxLayoutWidth != null ? { maxWidth: maxLayoutWidth } : undefined;

  const labelColor = isComposer
    ? colors.ink
    : isMine
      ? colors.accentInk
      : colors.accent;
  const bodyColor = isComposer
    ? colors.inkMuted
    : isMine
      ? colors.accentInk
      : colors.inkMuted;
  const listingColor = isComposer ? colors.inkMuted : bodyColor;
  const borderColor = isMine ? colors.accentInk : colors.accent;

  const previewBody = reply.body.trim()
    ? truncateReplyBody(reply.body)
    : null;
  const listingPreview = reply.referencedListing
    ? formatReplyListingPreview(reply.referencedListing)
    : null;

  const quoteBody = (
    <>
      <View style={isComposer ? styles.composerContent : undefined}>
        <Text
          style={[
            chatText,
            styles.sender,
            { color: labelColor },
            textWidthStyle,
          ]}
          numberOfLines={1}
        >
          {isComposer ? `Replying to ${senderLabel}` : senderLabel}
        </Text>
        {reply.unavailable ? (
          <Text
            style={[
              chatText,
              styles.unavailable,
              { color: colors.inkSoft },
              textWidthStyle,
            ]}
          >
            {UNAVAILABLE_LABEL}
          </Text>
        ) : (
          <>
            {previewBody ? (
              <Text
                style={[
                  chatText,
                  styles.body,
                  { color: bodyColor },
                  textWidthStyle,
                ]}
                numberOfLines={2}
              >
                {previewBody}
              </Text>
            ) : null}
            {listingPreview ? (
              onListingPress && reply.referencedListing ? (
                <Pressable
                  onPress={() => onListingPress(reply.referencedListing!.id)}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      chatText,
                      styles.listing,
                      { color: listingColor },
                      textWidthStyle,
                    ]}
                    numberOfLines={1}
                  >
                    {listingPreview}
                  </Text>
                </Pressable>
              ) : (
                <Text
                  style={[
                    chatText,
                    styles.listing,
                    { color: listingColor },
                    textWidthStyle,
                  ]}
                  numberOfLines={1}
                >
                  {listingPreview}
                </Text>
              )
            ) : null}
          </>
        )}
      </View>
      {onCancel ? (
        <Pressable
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel reply"
          hitSlop={8}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[chatText, styles.cancel, { color: colors.inkMuted }]}>
            Cancel
          </Text>
        </Pressable>
      ) : null}
    </>
  );

  if (isComposer) {
    return (
      <View style={styles.composerRow}>
        <SketchCard seed={42} padding={10} style={styles.composerCard}>
          <View style={styles.composerInner}>{quoteBody}</View>
        </SketchCard>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.wrap,
        styles.bubbleWrap,
        { borderLeftColor: borderColor },
      ]}
    >
      {quoteBody}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderLeftWidth: 2,
    paddingLeft: 10,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  bubbleWrap: {
    alignSelf: "flex-start",
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  composerCard: {
    flex: 1,
    minWidth: 0,
  },
  composerInner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  composerContent: {
    flex: 1,
    minWidth: 0,
  },
  sender: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2,
  },
  unavailable: {
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 2,
  },
  body: {
    fontSize: 12,
    marginTop: 2,
  },
  listing: {
    fontSize: 12,
    marginTop: 2,
  },
  cancel: {
    fontSize: 12,
    textDecorationLine: "underline",
    flexShrink: 0,
  },
});
