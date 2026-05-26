import { useAuth } from "@/src/components/auth/useAuth";
import { chatText } from "@/src/components/chat/chatText";
import { ChatComposer } from "@/src/components/chat/ChatComposer";
import { ChatMessageRow } from "@/src/components/chat/ChatMessageRow";
import { KeyboardDismissStrip } from "@/src/components/chat/KeyboardDismissStrip";
import { useKeyboardMetrics } from "@/src/components/chat/useKeyboardVisible";
import { DoodleScrollDownButton } from "@/src/components/ui/DoodleScrollDownButton";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { SCREEN_PADDING } from "@/src/constants/layout";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ChatDateDivider } from "@/src/components/chat/ChatDateDivider";
import { ChatStickyDateHeader } from "@/src/components/chat/ChatStickyDateHeader";
import { useStickyChatDate } from "@/src/components/chat/useStickyChatDate";
import {
  createOutboundClientId,
  createOutboundEntry,
  mergeOutboundWithServer,
  outboundEntryToSendArgs,
  type OutboundEntry,
} from "@/src/lib/chat/outboundMessages";
import { buildThreadItems, threadRowKey } from "@/src/lib/chat/threadItems";
import {
  isGroupConversation,
  isPendingMessageId,
  type ChatMessage,
  type ChatSendArgs,
  type ConversationPreview,
} from "@/src/lib/chat/types";
import { useRouter } from "expo-router";
import { useMutation, usePaginatedQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  InteractionManager,
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
  const { colors } = useOxTheme();
  const insets = useSafeAreaInsets();
  const { visible: keyboardVisible, height: keyboardHeight } =
    useKeyboardMetrics();
  const [outbound, setOutbound] = useState<OutboundEntry[]>([]);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [composerHeight, setComposerHeight] = useState(72);
  const listRef = useRef<FlatList>(null);
  const scrollToLatestAfterLayoutRef = useRef(false);

  const sendMessage = useMutation(api.chat.sendMessage);
  const markRead = useMutation(api.chat.markConversationRead);

  const { results: messages, loadMore, status } = usePaginatedQuery(
    api.chat.listMessages,
    { conversationId: conversation.id as Id<"conversations"> },
    { initialNumItems: 30 },
  );

  const displayMessages = useMemo(
    () => mergeOutboundWithServer(messages, outbound),
    [messages, outbound],
  );

  const threadItems = useMemo(
    () => buildThreadItems(displayMessages),
    [displayMessages],
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

  const scrollToLatest = useCallback((animated = true) => {
    listRef.current?.scrollToOffset({ offset: 0, animated });
    setAtBottom(true);
  }, []);

  const requestScrollToLatestAfterLayout = useCallback(() => {
    scrollToLatestAfterLayoutRef.current = true;
  }, []);

  useEffect(() => {
    if (!scrollToLatestAfterLayoutRef.current) return;
    scrollToLatestAfterLayoutRef.current = false;

    const task = InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        scrollToLatest(false);
      });
    });

    return () => task.cancel();
  }, [threadItems, scrollToLatest]);

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
    if (isPendingMessageId(message.id)) return;
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

  const conversationId = conversation.id as Id<"conversations">;

  const dispatchSend = useCallback(
    async (clientId: string, args: ChatSendArgs) => {
      try {
        const messageId = await sendMessage({
          conversationId,
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
        setOutbound((prev) =>
          prev.map((entry) =>
            entry.clientId === clientId
              ? { ...entry, serverMessageId: messageId, status: "sending" }
              : entry,
          ),
        );
      } catch {
        setOutbound((prev) =>
          prev.map((entry) =>
            entry.clientId === clientId
              ? { ...entry, status: "failed" }
              : entry,
          ),
        );
      }
    },
    [conversationId, sendMessage],
  );

  const handleSend = useCallback(
    (args: ChatSendArgs) => {
      const senderUserId = user?.id as Id<"users"> | undefined;
      if (!senderUserId) return;

      const clientId = createOutboundClientId();

      const sendArgs: ChatSendArgs = {
        body: args.body,
        ...(args.mentions && args.mentions.length > 0
          ? { mentions: args.mentions }
          : {}),
        ...(args.referencedListingId
          ? {
              referencedListingId: args.referencedListingId,
              referencedListing: args.referencedListing,
            }
          : {}),
        ...(args.replyToMessageId
          ? { replyToMessageId: args.replyToMessageId }
          : {}),
        ...(args.replyTo ? { replyTo: args.replyTo } : {}),
      };

      const entry = createOutboundEntry({
        clientId,
        conversationId,
        senderUserId,
        ...sendArgs,
      });

      setOutbound((prev) => [entry, ...prev]);
      setReplyTarget(null);
      requestScrollToLatestAfterLayout();
      void dispatchSend(clientId, sendArgs);
    },
    [conversationId, dispatchSend, requestScrollToLatestAfterLayout, user?.id],
  );

  const handleRetry = useCallback(
    (clientId: string) => {
      const entry = outbound.find((e) => e.clientId === clientId);
      if (!entry || entry.status !== "failed") return;
      setOutbound((prev) =>
        prev.map((e) =>
          e.clientId === clientId ? { ...e, status: "sending" } : e,
        ),
      );
      requestScrollToLatestAfterLayout();
      void dispatchSend(clientId, outboundEntryToSendArgs(entry));
    },
    [dispatchSend, outbound, requestScrollToLatestAfterLayout],
  );

  const latestMessageId = messages[0]?.id ?? null;

  useEffect(() => {
    void markRead({ conversationId });
  }, [conversationId, markRead, latestMessageId]);

  const composerBottomInset = keyboardVisible
    ? 8
    : Math.max(insets.bottom, 12);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={styles.listWrap}>
        {stickyLabel ? (
          <ChatStickyDateHeader label={stickyLabel} pushOffset={pushOffset} />
        ) : null}
        <FlatList
          ref={listRef}
          data={threadItems}
          inverted
          keyExtractor={threadRowKey}
          maintainVisibleContentPosition={
            atBottom ? undefined : { minIndexForVisible: 0 }
          }
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
                onRetry={handleRetry}
              />
            );
          }}
          contentContainerStyle={[
            styles.list,
            {
              paddingHorizontal: SCREEN_PADDING,
              paddingTop: composerHeight,
            },
          ]}
          style={[styles.listFill, { marginBottom: keyboardHeight }]}
        />
        {!atBottom && (
          <View style={styles.scrollFab} pointerEvents="box-none">
            <DoodleScrollDownButton
              seed={101}
              accessibilityLabel="Scroll to latest messages"
              onPress={() => scrollToLatest()}
            />
          </View>
        )}
      </View>
      <View
        style={[
          styles.composerDock,
          { backgroundColor: colors.bg, bottom: keyboardHeight },
        ]}
        onLayout={(e) => {
          const next = Math.ceil(e.nativeEvent.layout.height);
          setComposerHeight((prev) => (prev === next ? prev : next));
        }}
      >
        {keyboardVisible ? (
          <View style={styles.keyboardDismissOverlay} pointerEvents="box-none">
            <KeyboardDismissStrip enabled />
          </View>
        ) : null}
        <ChatComposer
          conversationId={conversationId}
          defaultMentionUsers={defaultMentionUsers}
          currentUserId={user?.id as Id<"users"> | undefined}
          keyboardVisible={keyboardVisible}
          replyTarget={replyTarget}
          onCancelReply={handleDismissReply}
          onListingPress={openListingDetail}
          onSend={handleSend}
          composerStyle={{
            paddingBottom: composerBottomInset,
            paddingHorizontal: SCREEN_PADDING,
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  listWrap: { flex: 1 },
  listFill: { flex: 1 },
  list: { paddingBottom: 12 },
  composerDock: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  keyboardDismissOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: -36,
    height: 36,
  },
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
