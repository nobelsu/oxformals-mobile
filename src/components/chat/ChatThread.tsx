import { useAuth } from "@/src/components/auth/useAuth";
import { useActiveChat } from "@/src/contexts/ActiveChatContext";
import { chatText } from "@/src/components/chat/chatText";
import { ChatComposer } from "@/src/components/chat/ChatComposer";
import { ChatMessageRow } from "@/src/components/chat/ChatMessageRow";
import { KeyboardDismissStrip } from "@/src/components/chat/KeyboardDismissStrip";
import { useKeyboardVisible } from "@/src/components/chat/useKeyboardVisible";
import { DoodleScrollDownButton } from "@/src/components/ui/DoodleScrollDownButton";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { SCREEN_PADDING } from "@/src/constants/layout";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ChatDateDivider } from "@/src/components/chat/ChatDateDivider";
import { ChatStickyDateHeader } from "@/src/components/chat/ChatStickyDateHeader";
import { useStickyChatDate } from "@/src/components/chat/useStickyChatDate";
import { buildThreadItems, threadRowKey } from "@/src/lib/chat/threadItems";
import {
  isGroupConversation,
  type ChatMention,
  type ChatMessage,
  type ConversationPreview,
} from "@/src/lib/chat/types";
import { useRouter } from "expo-router";
import { useHeaderHeight } from "@react-navigation/elements";
import { useMutation, usePaginatedQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SCROLL_BOTTOM_THRESHOLD = 48;

function MessageSeparator() {
  return <View style={styles.messageSeparator} />;
}

type Props = {
  conversation: ConversationPreview;
};

export function ChatThread({ conversation }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const { setActiveConversation } = useActiveChat();
  const { colors } = useOxTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const keyboardVisible = useKeyboardVisible();
  const [sending, setSending] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const listRef = useRef<FlatList>(null);

  const sendMessage = useMutation(api.chat.sendMessage);
  const markRead = useMutation(api.chat.markConversationRead);

  const { results: messages, loadMore, status } = usePaginatedQuery(
    api.chat.listMessages,
    { conversationId: conversation.id as Id<"conversations"> },
    { initialNumItems: 30 },
  );

  const threadItems = useMemo(
    () => buildThreadItems(messages),
    [messages],
  );

  const {
    stickyLabel,
    pushOffset,
    onScroll: onStickyScroll,
    onViewableItemsChanged,
    viewabilityConfig,
    getDividerOpacity,
  } = useStickyChatDate(threadItems);

  const loadingMoreRef = useRef(false);

  const openListingDetail = useCallback(
    (listingId: Id<"listings">) => {
      router.push(`/listing/${listingId}`);
    },
    [router],
  );

  useEffect(() => {
    if (status !== "LoadingMore") {
      loadingMoreRef.current = false;
    }
  }, [status]);

  const handleLoadMore = useCallback(() => {
    if (status !== "CanLoadMore" || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    loadMore(20);
  }, [loadMore, status]);

  const scrollToLatest = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    setAtBottom(true);
  }, []);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { nativeEvent } = e;
      const y = nativeEvent.contentOffset.y;
      const nextAtBottom = y <= SCROLL_BOTTOM_THRESHOLD;
      setAtBottom((prev) => (prev === nextAtBottom ? prev : nextAtBottom));
      onStickyScroll(nativeEvent);
    },
    [onStickyScroll],
  );

  const handleReply = useCallback((message: ChatMessage) => {
    setReplyTarget(message);
  }, []);

  const handleDismissReply = useCallback(() => {
    setReplyTarget(null);
  }, []);

  const defaultMentionUsers = useMemo(() => {
    if (isGroupConversation(conversation)) {
      return conversation.memberPreview.map((m) => ({
        id: m.id,
        name: m.name,
      }));
    }
    return [
      {
        id: conversation.otherUserId,
        name: conversation.otherUserName,
      },
    ];
  }, [conversation]);

  const handleSend = useCallback(
    async (args: {
      body: string;
      mentions?: ChatMention[];
      referencedListingId?: Id<"listings">;
      replyToMessageId?: Id<"messages">;
    }) => {
      setSending(true);
      try {
        await sendMessage({
          conversationId: conversation.id as Id<"conversations">,
          body: args.body,
          ...(args.mentions && args.mentions.length > 0
            ? { mentions: args.mentions }
            : {}),
          ...(args.referencedListingId
            ? { referencedListingId: args.referencedListingId }
            : {}),
          ...(args.replyToMessageId
            ? { replyToMessageId: args.replyToMessageId }
            : {}),
        });
        setReplyTarget(null);
        scrollToLatest();
      } finally {
        setSending(false);
      }
    },
    [conversation.id, scrollToLatest, sendMessage],
  );

  useEffect(() => {
    void markRead({ conversationId: conversation.id as Id<"conversations"> });
  }, [conversation.id, markRead]);

  useEffect(() => {
    const id = conversation.id as Id<"conversations">;
    setActiveConversation(id);
    return () => setActiveConversation(null);
  }, [conversation.id, setActiveConversation]);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <View style={styles.listWrap}>
        {stickyLabel ? (
          <ChatStickyDateHeader label={stickyLabel} pushOffset={pushOffset} />
        ) : null}
        <FlatList
          ref={listRef}
          data={threadItems}
          inverted
          keyExtractor={threadRowKey}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          onScroll={handleScroll}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          scrollEventThrottle={16}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.2}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          removeClippedSubviews={false}
          ListHeaderComponent={
            <KeyboardDismissStrip enabled={keyboardVisible} />
          }
          ItemSeparatorComponent={MessageSeparator}
          ListFooterComponent={
            status === "LoadingMore" ? (
              <Text
                style={[
                  chatText,
                  styles.loadingEarlier,
                  { color: colors.inkSoft },
                ]}
              >
                Loading earlier messages…
              </Text>
            ) : null
          }
          renderItem={({ item, index }) => {
            if (item.kind === "dateDivider") {
              return (
                <ChatDateDivider
                  label={item.label}
                  opacity={getDividerOpacity(
                    item.dateKey,
                    item.label,
                    index,
                  )}
                />
              );
            }

            return (
              <ChatMessageRow
                message={item.message}
                conversation={conversation}
                currentUserId={user?.id as Id<"users"> | undefined}
                keyboardVisible={keyboardVisible}
                onReply={handleReply}
                onListingPress={openListingDetail}
              />
            );
          }}
          contentContainerStyle={[
            styles.list,
            { paddingHorizontal: SCREEN_PADDING },
          ]}
        />
        {!atBottom && (
          <View style={styles.scrollFab} pointerEvents="box-none">
            <DoodleScrollDownButton
              seed={101}
              accessibilityLabel="Scroll to latest messages"
              onPress={scrollToLatest}
            />
          </View>
        )}
      </View>
      <KeyboardDismissStrip enabled={keyboardVisible} />
      <ChatComposer
        conversationId={conversation.id as Id<"conversations">}
        defaultMentionUsers={defaultMentionUsers}
        currentUserId={user?.id as Id<"users"> | undefined}
        keyboardVisible={keyboardVisible}
        replyTarget={replyTarget}
        onCancelReply={handleDismissReply}
        onListingPress={openListingDetail}
        onSend={handleSend}
        sending={sending}
        composerStyle={{
          paddingBottom: Math.max(insets.bottom, 12),
          paddingHorizontal: SCREEN_PADDING,
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  listWrap: { flex: 1 },
  list: { paddingVertical: 12 },
  messageSeparator: { height: 4 },
  scrollFab: {
    position: "absolute",
    right: SCREEN_PADDING,
    bottom: 12,
    zIndex: 2,
  },
  loadingEarlier: {
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 8,
  },
});
