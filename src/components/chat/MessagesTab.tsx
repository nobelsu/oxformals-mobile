import { ConversationListRow } from "@/src/components/chat/ConversationListRow";
import { ConversationListSeparator } from "@/src/components/chat/ConversationListSeparator";
import { MessagesEmptyState } from "@/src/components/chat/MessagesEmptyState";
import { useAuth } from "@/src/components/auth/useAuth";
import { DoodleAddButton } from "@/src/components/ui/DoodleAddButton";
import { DoodleCloseButton } from "@/src/components/ui/DoodleCloseButton";
import { OxInput } from "@/src/components/ui/OxInput";
import { OxLoadingView } from "@/src/components/ui/OxLoadingView";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import {
  SCREEN_PADDING,
  TAB_SCREEN_EDGES,
  TAB_SCREEN_TITLE_PADDING_TOP,
  tabScreenTitleText,
} from "@/src/constants/layout";
import { oxText } from "@/src/constants/oxText";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { filterConversationsByQuery } from "@/src/lib/chat/conversationList";
import { chatConversationHref, newChatHref } from "@/src/lib/chat/navigation";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const MESSAGES_SEARCH_SEED = 41;
const SEARCH_FOCUS_ANIM_MS = 220;
const MESSAGES_HEADER_DEFAULT_HEIGHT = 56;
const MESSAGES_HEADER_MARGIN_BOTTOM = 12;

type CollapsibleMessagesHeaderProps = {
  focusBoost: SharedValue<number>;
  maxHeight: SharedValue<number>;
  accessibilityHidden: boolean;
  children: ReactNode;
};

function CollapsibleMessagesHeader({
  focusBoost,
  maxHeight,
  accessibilityHidden,
  children,
}: CollapsibleMessagesHeaderProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const progress = focusBoost.value;
    const expandedHeight = maxHeight.value + MESSAGES_HEADER_MARGIN_BOTTOM;
    const collapse = 1 - progress;
    return {
      height: expandedHeight * collapse,
      opacity: collapse,
      marginBottom: MESSAGES_HEADER_MARGIN_BOTTOM * collapse,
      overflow: "hidden" as const,
    };
  });

  return (
    <Animated.View
      style={animatedStyle}
      accessibilityElementsHidden={accessibilityHidden}
      importantForAccessibility={
        accessibilityHidden ? "no-hide-descendants" : "auto"
      }
      pointerEvents={accessibilityHidden ? "none" : "auto"}
    >
      {children}
    </Animated.View>
  );
}

function separatorSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

export function MessagesTab() {
  const router = useRouter();
  const { colors } = useOxTheme();
  const { user } = useAuth();
  const conversations = useQuery(api.chat.listMyConversations);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchBarFocused, setSearchBarFocused] = useState(false);
  const searchFocused = useSharedValue(0);
  const headerMaxHeight = useSharedValue(MESSAGES_HEADER_DEFAULT_HEIGHT);

  const handleSearchFocusChange = useCallback(
    (focused: boolean) => {
      setSearchBarFocused(focused);
      searchFocused.value = withTiming(focused ? 1 : 0, {
        duration: SEARCH_FOCUS_ANIM_MS,
      });
    },
    [searchFocused],
  );

  const filteredConversations = useMemo(
    () => filterConversationsByQuery(conversations ?? [], searchQuery),
    [conversations, searchQuery],
  );

  const openConversation = (conversationId: Id<"conversations">) => {
    router.push(chatConversationHref(conversationId));
  };

  if (conversations === undefined) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.bg }}
        edges={TAB_SCREEN_EDGES}
      >
        <OxLoadingView fill />
      </SafeAreaView>
    );
  }

  const noSearchMatches =
    conversations.length > 0 && filteredConversations.length === 0;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg }}
      edges={TAB_SCREEN_EDGES}
    >
      <FlatList
        style={{ flex: 1 }}
        data={filteredConversations}
        keyExtractor={(c) => c.id}
        contentContainerStyle={[
          styles.list,
          filteredConversations.length === 0 && styles.listEmpty,
        ]}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <CollapsibleMessagesHeader
              focusBoost={searchFocused}
              maxHeight={headerMaxHeight}
              accessibilityHidden={searchBarFocused}
            >
              <View
                style={styles.header}
                onLayout={(e) => {
                  headerMaxHeight.value = e.nativeEvent.layout.height;
                }}
              >
                <Text
                  style={[tabScreenTitleText, { color: colors.ink }]}
                  accessibilityRole="header"
                >
                  Messages
                </Text>
                <DoodleAddButton
                  seed={12}
                  accessibilityLabel="New chat"
                  onPress={() => router.push(newChatHref())}
                />
              </View>
            </CollapsibleMessagesHeader>
            <View style={styles.searchRow}>
              <View style={styles.searchInputWrap}>
                <View style={styles.searchIcon} pointerEvents="none">
                  <Ionicons
                    name="search-outline"
                    size={18}
                    color={colors.inkMuted}
                  />
                </View>
                <OxInput
                  seed={MESSAGES_SEARCH_SEED}
                  placeholder="Search chats…"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onFocusChange={handleSearchFocusChange}
                  autoCapitalize="none"
                  autoCorrect={false}
                  focusStroke={colors.accent}
                  wrapperStyle={styles.searchOutline}
                  style={[
                    styles.searchInput,
                    searchQuery !== "" ? styles.searchInputWithClear : null,
                  ]}
                />
                {searchQuery !== "" ? (
                  <View style={styles.clearSearch}>
                    <DoodleCloseButton
                      onPress={() => setSearchQuery("")}
                      accessibilityLabel="Clear search"
                      seed={43}
                      size={28}
                    />
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          filteredConversations.length === 0 ? (
            <View style={styles.emptyWrap}>
              {conversations.length === 0 ? (
                <MessagesEmptyState style={styles.empty} />
              ) : noSearchMatches ? (
                <View style={styles.noMatchesBlock}>
                  <Text
                    style={[
                      styles.noMatchesTitle,
                      { color: colors.ink, fontFamily: FONT_DISPLAY },
                    ]}
                  >
                    No matches
                  </Text>
                  <Text
                    style={[styles.noMatchesBody, { color: colors.inkMuted }]}
                  >
                    Try a different name or college.
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null
        }
        ItemSeparatorComponent={({ leadingItem }) =>
          leadingItem ? (
            <ConversationListSeparator seed={separatorSeed(leadingItem.id)} />
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.rowWrap}>
            <ConversationListRow
              conversation={item}
              viewerUserId={user?.id}
              onPress={() => openConversation(item.id)}
            />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: 32,
  },
  listEmpty: {
    flexGrow: 1,
  },
  emptyWrap: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 24,
  },
  headerBlock: {
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: TAB_SCREEN_TITLE_PADDING_TOP,
  },
  searchRow: {
    paddingHorizontal: SCREEN_PADDING,
    marginBottom: 8,
  },
  searchInputWrap: {
    position: "relative",
    justifyContent: "center",
  },
  searchOutline: {
    flex: 1,
  },
  searchInput: {
    paddingLeft: 36,
    paddingRight: 12,
  },
  searchInputWithClear: {
    paddingRight: 36,
  },
  searchIcon: {
    position: "absolute",
    left: 8,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    width: 18,
    zIndex: 1,
  },
  clearSearch: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  rowWrap: {
    paddingHorizontal: SCREEN_PADDING,
  },
  empty: {
    marginHorizontal: SCREEN_PADDING,
  },
  noMatchesBlock: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: SCREEN_PADDING,
  },
  noMatchesTitle: {
    fontSize: 22,
    textTransform: "uppercase",
    textAlign: "center",
  },
  noMatchesBody: {
    ...oxText,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
});
