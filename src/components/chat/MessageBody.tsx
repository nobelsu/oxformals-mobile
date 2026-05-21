import { chatText } from "@/src/components/chat/chatText";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { segmentMessageBody } from "@/src/lib/chat/mentions";
import type { ChatMention } from "@/src/lib/chat/types";
import type { Id } from "@/convex/_generated/dataModel";
import { openProfile } from "@/src/lib/profile/navigation";
import { useRouter } from "expo-router";
import { StyleSheet, Text } from "react-native";

type Props = {
  body: string;
  mentions?: ChatMention[];
  isMine?: boolean;
  currentUserId?: Id<"users">;
  /** Caps line width so body text wraps inside the bubble. */
  maxLayoutWidth?: number;
};

export function MessageBody({
  body,
  mentions,
  isMine = false,
  currentUserId,
  maxLayoutWidth,
}: Props) {
  const { colors } = useOxTheme();
  const router = useRouter();
  const segments = segmentMessageBody(body, mentions);
  const mentionColor = isMine ? colors.accentInk : colors.accent;
  const textColor = isMine ? colors.accentInk : colors.ink;

  return (
    <Text
      style={[
        chatText,
        styles.body,
        { color: textColor },
        maxLayoutWidth != null ? { maxWidth: maxLayoutWidth } : undefined,
      ]}
    >
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return segment.text;
        }
        return (
          <Text
            key={`${segment.userId}-${index}`}
            onPress={() =>
              openProfile(router, segment.userId, currentUserId)
            }
            style={[styles.mention, { color: mentionColor }]}
          >
            @{segment.label}
          </Text>
        );
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  mention: {
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
