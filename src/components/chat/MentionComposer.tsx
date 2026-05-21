import { chatText } from "@/src/components/chat/chatText";
import { Avatar } from "@/src/components/ui/Avatar";
import { OxInput } from "@/src/components/ui/OxInput";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { api } from "@/convex/_generated/api";
import {
  applyTextChange,
  getMentionTrigger,
  insertMention,
} from "@/src/lib/chat/mentionComposer";
import {
  filterMentionCandidates,
  MAX_MENTIONS_PER_MESSAGE,
  type MentionParticipant,
} from "@/src/lib/chat/mentions";
import type { ChatMention } from "@/src/lib/chat/types";
import { useQuery } from "convex/react";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextInput,
  type TextInputSelectionChangeEventData,
  type ViewStyle,
} from "react-native";

export type MentionComposerHandle = {
  serialize: () => { body: string; mentions: ChatMention[] };
  clear: () => void;
  setPlainText: (text: string) => void;
  isEmpty: () => boolean;
  focus: () => void;
};

type Props = {
  defaultMentionUsers?: MentionParticipant[];
  disabled?: boolean;
  placeholder?: string;
  onBodyChange?: (body: string) => void;
  onEmptyChange?: (isEmpty: boolean) => void;
  wrapperStyle?: StyleProp<ViewStyle>;
  compact?: boolean;
  seed?: number;
};

export const MentionComposer = forwardRef<MentionComposerHandle, Props>(
  function MentionComposer(
    {
      defaultMentionUsers = [],
      disabled = false,
      placeholder = "@ to mention someone",
      onBodyChange,
      onEmptyChange,
      wrapperStyle,
      compact,
      seed = 99,
    },
    ref,
  ) {
    const { colors } = useOxTheme();
    const inputRef = useRef<TextInput>(null);
    const [text, setText] = useState("");
    const [mentions, setMentions] = useState<ChatMention[]>([]);
    const [selection, setSelection] = useState({ start: 0, end: 0 });
    const [dismissed, setDismissed] = useState(false);

    const cursor = selection.end;
    const atMentionLimit = mentions.length >= MAX_MENTIONS_PER_MESSAGE;

    const mentionTrigger = useMemo(() => {
      if (dismissed || atMentionLimit) return null;
      return getMentionTrigger(text, cursor, mentions);
    }, [text, cursor, mentions, dismissed, atMentionLimit]);

    const mentionQuery = mentionTrigger?.query ?? "";
    const useRemoteSearch =
      mentionTrigger !== null && mentionQuery.length >= 1;

    const searchResults = useQuery(
      api.chat.searchUsersForMention,
      useRemoteSearch ? { query: mentionQuery } : "skip",
    );

    const candidates = useMemo((): MentionParticipant[] => {
      if (!mentionTrigger) return [];

      if (useRemoteSearch) {
        return (searchResults ?? []).map((u) => ({
          id: u.id,
          name: u.name,
          ...(u.college ? { college: u.college } : {}),
        }));
      }

      return filterMentionCandidates(mentionQuery, defaultMentionUsers);
    }, [
      mentionTrigger,
      useRemoteSearch,
      mentionQuery,
      searchResults,
      defaultMentionUsers,
    ]);

    const syncCallbacks = useCallback(
      (nextText: string, nextMentions: ChatMention[]) => {
        onBodyChange?.(nextText);
        onEmptyChange?.(nextText.trim().length === 0);
      },
      [onBodyChange, onEmptyChange],
    );

    useImperativeHandle(
      ref,
      () => ({
        serialize: () => ({
          body: text,
          mentions: [...mentions],
        }),
        clear: () => {
          setText("");
          setMentions([]);
          setSelection({ start: 0, end: 0 });
          setDismissed(false);
          onBodyChange?.("");
          onEmptyChange?.(true);
        },
        setPlainText: (plain: string) => {
          setText(plain);
          setMentions([]);
          const end = plain.length;
          setSelection({ start: end, end });
          setDismissed(false);
          syncCallbacks(plain, []);
        },
        isEmpty: () => text.trim().length === 0,
        focus: () => {
          inputRef.current?.focus();
        },
      }),
      [text, mentions, onBodyChange, onEmptyChange, syncCallbacks],
    );

    const handleChangeText = useCallback(
      (nextText: string) => {
        const prevText = text;
        const { text: updatedText, mentions: updatedMentions } =
          applyTextChange(prevText, nextText, selection.start, mentions);
        setText(updatedText);
        setMentions(updatedMentions);
        setDismissed(false);
        syncCallbacks(updatedText, updatedMentions);
      },
      [text, selection.start, mentions, syncCallbacks],
    );

    const handleSelectionChange = useCallback(
      (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
        const { start, end } = e.nativeEvent.selection;
        setSelection({ start, end });
        setDismissed(false);
      },
      [],
    );

    const selectCandidate = useCallback(
      (user: MentionParticipant) => {
        const result = insertMention(text, cursor, mentions, user);
        setText(result.text);
        setMentions(result.mentions);
        setSelection({ start: result.cursor, end: result.cursor });
        setDismissed(true);
        syncCallbacks(result.text, result.mentions);
        requestAnimationFrame(() => inputRef.current?.focus());
      },
      [text, cursor, mentions, syncCallbacks],
    );

    const showPopover = mentionTrigger !== null;
    const searchLoading = useRemoteSearch && searchResults === undefined;

    return (
      <View style={styles.wrap}>
        {showPopover ? (
          <View
            style={[
              styles.popover,
              {
                borderColor: `${colors.ink}33`,
                backgroundColor: colors.paper,
              },
            ]}
          >
            {atMentionLimit ? (
              <Text style={[chatText, styles.popoverHint, { color: colors.inkMuted }]}>
                At most {MAX_MENTIONS_PER_MESSAGE} mentions per message
              </Text>
            ) : searchLoading ? (
              <Text style={[chatText, styles.popoverHint, { color: colors.inkMuted }]}>
                Searching…
              </Text>
            ) : candidates.length === 0 ? (
              <Text style={[chatText, styles.popoverHint, { color: colors.inkMuted }]}>
                {useRemoteSearch
                  ? "No matches"
                  : "Type a name to search for someone to mention"}
              </Text>
            ) : (
              <FlatList
                data={candidates}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="always"
                style={styles.candidateList}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => selectCandidate(item)}
                    style={({ pressed }) => [
                      styles.candidateRow,
                      pressed ? { backgroundColor: `${colors.ink}14` } : undefined,
                    ]}
                  >
                    <Avatar name={item.name} size={36} />
                    <View style={styles.candidateText}>
                      <Text
                        style={[chatText, styles.candidateName, { color: colors.ink }]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      {item.college ? (
                        <Text
                          style={[
                            chatText,
                            styles.candidateCollege,
                            { color: colors.inkMuted },
                          ]}
                          numberOfLines={1}
                        >
                          {item.college}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                )}
              />
            )}
          </View>
        ) : null}

        <OxInput
          ref={inputRef}
          seed={seed}
          compact={compact}
          placeholder={placeholder}
          value={text}
          onChangeText={handleChangeText}
          onSelectionChange={handleSelectionChange}
          editable={!disabled}
          multiline
          wrapperStyle={[styles.inputWrap, wrapperStyle]}
          onKeyPress={(e) => {
            if (mentionTrigger && e.nativeEvent.key === " ") {
              setDismissed(true);
            }
          }}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minWidth: 0,
    position: "relative",
  },
  popover: {
    position: "absolute",
    bottom: "100%",
    left: 0,
    right: 0,
    marginBottom: 8,
    maxHeight: 200,
    borderWidth: 2,
    borderRadius: 12,
    overflow: "hidden",
    zIndex: 20,
  },
  popoverHint: {
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  candidateList: {
    maxHeight: 200,
  },
  candidateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  candidateText: {
    flex: 1,
    minWidth: 0,
  },
  candidateName: {
    fontSize: 14,
    fontWeight: "600",
  },
  candidateCollege: {
    fontSize: 12,
  },
  inputWrap: {
    flex: 1,
    marginRight: 0,
  },
});
