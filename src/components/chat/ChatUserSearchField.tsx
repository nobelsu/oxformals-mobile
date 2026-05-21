import { chatText } from "@/src/components/chat/chatText";
import { Avatar } from "@/src/components/ui/Avatar";
import { OxInput } from "@/src/components/ui/OxInput";
import { OxSpinner } from "@/src/components/ui/OxSpinner";
import { SketchCard } from "@/src/components/ui/SketchCard";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { CARD_GAP } from "@/src/constants/layout";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type ChatSearchUser = {
  id: Id<"users">;
  name: string;
  college?: string;
};

type Props = {
  onSelect: (user: ChatSearchUser) => void;
  excludeIds?: Iterable<Id<"users">>;
  placeholder?: string;
  disabled?: boolean;
  clearOnSelect?: boolean;
};

const MIN_QUERY_LENGTH = 2;

function ChatUserSearchResultRow({
  user,
  disabled,
  onPress,
}: {
  user: ChatSearchUser;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors } = useOxTheme();

  return (
    <Pressable disabled={disabled} onPress={onPress} style={styles.resultRow}>
      <SketchCard seed={user.id.length} padding={10}>
        <View style={styles.resultInner}>
          <Avatar name={user.name} size={36} />
          <View style={styles.resultText}>
            <Text style={[chatText, { color: colors.ink, fontSize: 15 }]}>
              {user.name}
            </Text>
            {user.college ? (
              <Text style={[chatText, { color: colors.inkMuted, fontSize: 13 }]}>
                {user.college}
              </Text>
            ) : null}
          </View>
        </View>
      </SketchCard>
    </Pressable>
  );
}

export function ChatUserSearchField({
  onSelect,
  excludeIds,
  placeholder = "Search by name or college…",
  disabled,
  clearOnSelect = true,
}: Props) {
  const { colors } = useOxTheme();
  const [query, setQuery] = useState("");

  const trimmed = query.trim();
  const searchResults = useQuery(
    api.chat.searchUsersForChat,
    trimmed.length >= MIN_QUERY_LENGTH ? { query: trimmed } : "skip",
  );

  const excludeSet =
    excludeIds instanceof Set ? excludeIds : new Set(excludeIds ?? []);
  const candidates =
    searchResults?.filter((u) => !excludeSet.has(u.id)) ?? [];

  const handleSelect = (user: ChatSearchUser) => {
    onSelect(user);
    if (clearOnSelect) setQuery("");
  };

  return (
    <View style={styles.wrap}>
      <OxInput
        placeholder={placeholder}
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!disabled}
      />

      {trimmed.length < MIN_QUERY_LENGTH ? (
        <Text style={[chatText, styles.hint, { color: colors.inkMuted }]}>
          Type at least {MIN_QUERY_LENGTH} characters to search.
        </Text>
      ) : searchResults === undefined ? (
        <OxSpinner size="md" style={styles.loader} />
      ) : candidates.length > 0 ? (
        <View style={styles.results}>
          {candidates.map((u) => (
            <ChatUserSearchResultRow
              key={u.id}
              user={u}
              disabled={disabled}
              onPress={() => handleSelect(u)}
            />
          ))}
        </View>
      ) : (
        <Text style={[chatText, styles.hint, { color: colors.inkMuted }]}>
          No users found.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  hint: { fontSize: 13, marginTop: 8 },
  loader: { marginTop: 16 },
  results: { marginTop: 8, gap: CARD_GAP },
  resultRow: {},
  resultInner: { flexDirection: "row", alignItems: "center", gap: 10 },
  resultText: { flex: 1 },
});
