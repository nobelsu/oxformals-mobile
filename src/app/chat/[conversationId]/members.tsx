import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { GroupMembersManager } from "@/src/components/chat/GroupMembersManager";
import { chatText } from "@/src/components/chat/chatText";
import { OxLoadingView } from "@/src/components/ui/OxLoadingView";
import { SCREEN_PADDING } from "@/src/constants/layout";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { chatConversationHref } from "@/src/lib/chat/navigation";
import { isGroupConversation } from "@/src/lib/chat/types";
import { useQuery } from "convex/react";
import { Redirect, Stack, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

export default function GroupMembersScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { colors } = useOxTheme();

  const conversation = useQuery(
    api.chat.getConversation,
    conversationId
      ? { conversationId: conversationId as Id<"conversations"> }
      : "skip",
  );

  if (conversation === undefined) {
    return <OxLoadingView fill />;
  }

  if (conversation === null) {
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: SCREEN_PADDING }}>
        <Text style={[chatText, { color: colors.inkMuted }]}>
          Conversation not found.
        </Text>
      </View>
    );
  }

  if (!isGroupConversation(conversation)) {
    return (
      <Redirect href={chatConversationHref(conversation.id)} />
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Group members" }} />
      <GroupMembersManager conversation={conversation} />
    </>
  );
}
