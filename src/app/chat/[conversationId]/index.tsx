import { useAuth } from "@/src/components/auth/useAuth";
import { ChatThread } from "@/src/components/chat/ChatThread";
import { GroupAvatarStack } from "@/src/components/chat/GroupAvatarStack";
import { Avatar } from "@/src/components/ui/Avatar";
import type { AvatarSource } from "@/src/lib/auth/types";
import { chatText } from "@/src/components/chat/chatText";
import { OxLoadingView } from "@/src/components/ui/OxLoadingView";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { chatGroupMembersHref } from "@/src/lib/chat/navigation";
import { openProfile } from "@/src/lib/profile/navigation";
import {
  isGroupConversation,
  type GroupConversationPreview,
} from "@/src/lib/chat/types";
import { useQuery } from "convex/react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import {
  SCREEN_PADDING,
  STACK_HEADER_BACK_RESERVE,
} from "@/src/constants/layout";

function GroupChatHeader({
  conversation,
  onPress,
}: {
  conversation: GroupConversationPreview;
  onPress: () => void;
}) {
  const { colors } = useOxTheme();
  const { width: screenWidth } = useWindowDimensions();
  const displayTitle = conversation.name ?? conversation.title;
  // Native stack has no headerTitleContainerStyle; reserve space for back button.
  const headerWidth = screenWidth - STACK_HEADER_BACK_RESERVE;

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="View group members"
      style={[styles.headerRow, { width: headerWidth }]}
    >
      <View style={styles.headerTextCol}>
        <Text
          style={[
            styles.headerTitle,
            { color: colors.ink, fontFamily: FONT_DISPLAY },
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {displayTitle.toUpperCase()}
        </Text>
        <Text
          style={[chatText, styles.headerSubtitle, { color: colors.inkMuted }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {conversation.memberCount} members · tap to manage
        </Text>
      </View>
      <View style={styles.avatarStack}>
        <GroupAvatarStack
          members={conversation.memberPreview}
          memberCount={conversation.memberCount}
          size={32}
        />
      </View>
    </Pressable>
  );
}

function DmChatHeader({
  name,
  avatar,
  onPress,
}: {
  name: string;
  avatar?: AvatarSource;
  onPress: () => void;
}) {
  const { colors } = useOxTheme();
  const { width: screenWidth } = useWindowDimensions();
  const headerWidth = screenWidth - STACK_HEADER_BACK_RESERVE;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View ${name}'s profile`}
      style={[styles.headerRow, { width: headerWidth }]}
    >
      <View style={styles.headerAvatar}>
        <Avatar name={name} avatar={avatar} size={32} />
      </View>
      <Text
        style={[
          styles.headerTitle,
          { color: colors.ink, fontFamily: FONT_DISPLAY, flex: 1 },
        ]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {name}
      </Text>
    </Pressable>
  );
}

export default function ConversationScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const router = useRouter();
  const { colors } = useOxTheme();
  const { user: currentUser } = useAuth();

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

  const isGroup = isGroupConversation(conversation);
  const openMembers = () =>
    router.push(chatGroupMembersHref(conversation.id));

  return (
    <>
      <Stack.Screen
        options={
          isGroup
            ? {
                headerShown: true,
                headerTitleAlign: "left",
                headerTitle: () => (
                  <GroupChatHeader
                    conversation={conversation}
                    onPress={openMembers}
                  />
                ),
                headerRight: () => null,
              }
            : {
                headerShown: true,
                headerTitleAlign: "left",
                headerTitle: () => (
                  <DmChatHeader
                    name={conversation.otherUserName}
                    avatar={conversation.otherUserAvatar}
                    onPress={() =>
                      openProfile(
                        router,
                        conversation.otherUserId,
                        currentUser?.id,
                      )
                    }
                  />
                ),
              }
        }
      />
      <ChatThread conversation={conversation} />
    </>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
    paddingRight: 8,
  },
  headerTextCol: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 18,
    lineHeight: 22,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  avatarStack: {
    flexShrink: 0,
    marginLeft: 12,
  },
  headerAvatar: {
    flexShrink: 0,
    marginRight: 10,
  },
});
