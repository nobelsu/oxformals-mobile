import { useAuth } from "@/src/components/auth/useAuth";
import {
  ChatUserSearchField,
  type ChatSearchUser,
} from "@/src/components/chat/ChatUserSearchField";
import { chatText } from "@/src/components/chat/chatText";
import { Chip } from "@/src/components/ui/Chip";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxInput } from "@/src/components/ui/OxInput";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { SCREEN_PADDING } from "@/src/constants/layout";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { MAX_GROUP_SIZE } from "@/src/lib/chat/constants";
import { chatConversationHref } from "@/src/lib/chat/navigation";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

type Mode = "dm" | "group";

type SelectedMember = {
  name: string;
  college?: string;
};

export function NewChatPicker() {
  const router = useRouter();
  const { colors } = useOxTheme();
  const { user: viewer } = useAuth();

  const getOrCreateConversation = useMutation(api.chat.getOrCreateConversation);
  const createGroupConversation = useMutation(api.chat.createGroupConversation);

  const [mode, setMode] = useState<Mode>("dm");
  const [selectedMembers, setSelectedMembers] = useState<
    Map<Id<"users">, SelectedMember>
  >(new Map());
  const [groupName, setGroupName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxOthers = MAX_GROUP_SIZE - 1;
  const selectedIds = new Set(selectedMembers.keys());

  const openConversation = (conversationId: Id<"conversations">) => {
    router.replace(chatConversationHref(conversationId));
  };

  const removeMember = (id: Id<"users">) => {
    setError(null);
    setSelectedMembers((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  };

  const addMember = (user: ChatSearchUser) => {
    setError(null);
    if (selectedMembers.has(user.id)) return;

    if (selectedMembers.size >= maxOthers) {
      setError(`Groups can have at most ${MAX_GROUP_SIZE} members`);
      return;
    }

    setSelectedMembers((prev) => {
      const next = new Map(prev);
      next.set(user.id, { name: user.name, college: user.college });
      return next;
    });
  };

  const openDm = async (otherUserId: Id<"users">) => {
    setBusy(true);
    setError(null);
    try {
      const id = await getOrCreateConversation({ otherUserId });
      openConversation(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start chat");
      setBusy(false);
    }
  };

  const createGroup = async () => {
    if (!viewer || selectedMembers.size === 0) return;
    setBusy(true);
    setError(null);
    try {
      const id = await createGroupConversation({
        memberUserIds: [viewer.id as Id<"users">, ...selectedMembers.keys()],
        name: groupName.trim() || undefined,
      });
      openConversation(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create group");
      setBusy(false);
    }
  };

  const handleSelect = (user: ChatSearchUser) => {
    if (mode === "dm") {
      void openDm(user.id);
    } else {
      addMember(user);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.modeRow}>
          <Chip
            label="Message"
            selected={mode === "dm"}
            onPress={() => {
              setMode("dm");
              setSelectedMembers(new Map());
              setError(null);
            }}
          />
          <Chip
            label="Group"
            selected={mode === "group"}
            onPress={() => {
              setMode("group");
              setError(null);
            }}
          />
        </View>

        {mode === "group" && (
          <OxInput
            placeholder="Group name (optional)"
            value={groupName}
            onChangeText={setGroupName}
            editable={!busy}
            wrapperStyle={styles.groupName}
          />
        )}

        {mode === "group" && selectedMembers.size > 0 && (
          <>
            <Text style={[chatText, styles.hint, { color: colors.inkMuted }]}>
              {selectedMembers.size} selected · up to {maxOthers} others · tap
              to remove
            </Text>
            <View style={styles.selectedRow}>
              {[...selectedMembers.entries()].map(([id, member]) => (
                <Chip
                  key={id}
                  label={member.name}
                  selected
                  onPress={() => removeMember(id)}
                />
              ))}
            </View>
          </>
        )}

        <ChatUserSearchField
          onSelect={handleSelect}
          excludeIds={mode === "group" ? selectedIds : undefined}
          placeholder={
            mode === "dm"
              ? "Search by name or college…"
              : "Add people by name or college…"
          }
          disabled={busy}
          clearOnSelect
        />

        {error ? (
          <Text style={[chatText, styles.error, { color: colors.danger }]}>
            {error}
          </Text>
        ) : null}
      </ScrollView>

      {mode === "group" && (
        <View
          style={[
            styles.stickyFooter,
            {
              borderTopColor: `${colors.ink}1a`,
              backgroundColor: colors.bg,
            },
          ]}
        >
          <OxButton
            title="Create group"
            onPress={() => void createGroup()}
            loading={busy}
            disabled={selectedMembers.size === 0}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 8,
    paddingBottom: 16,
  },
  modeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  groupName: { marginBottom: 8 },
  hint: { fontSize: 13, marginBottom: 8 },
  selectedRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  error: { fontSize: 14, marginTop: 12 },
  stickyFooter: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 2,
  },
});
