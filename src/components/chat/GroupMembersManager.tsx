import { useAuth } from "@/src/components/auth/useAuth";
import { ChatUserSearchField } from "@/src/components/chat/ChatUserSearchField";
import { chatText } from "@/src/components/chat/chatText";
import { Avatar } from "@/src/components/ui/Avatar";
import { DoodleDivider } from "@/src/components/ui/DoodleDivider";
import { DoodleOutline } from "@/src/components/ui/DoodleOutline";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxInput } from "@/src/components/ui/OxInput";
import { OxSpinner } from "@/src/components/ui/OxSpinner";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { SCREEN_PADDING } from "@/src/constants/layout";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  MAX_GROUP_NAME_LENGTH,
  MAX_GROUP_SIZE,
} from "@/src/lib/chat/constants";
import { chatsTabHref } from "@/src/lib/chat/navigation";
import { openProfile } from "@/src/lib/profile/navigation";
import type { GroupConversationPreview } from "@/src/lib/chat/types";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useHeaderHeight } from "@react-navigation/elements";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Props = {
  conversation: GroupConversationPreview;
};

function seedFrom(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

export function GroupMembersManager({ conversation }: Props) {
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const { colors } = useOxTheme();
  const { user } = useAuth();

  const [groupName, setGroupName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const members = useQuery(api.chat.listGroupMembers, {
    conversationId: conversation.id,
  });

  const addGroupMember = useMutation(api.chat.addGroupMember);
  const removeGroupMember = useMutation(api.chat.removeGroupMember);
  const leaveGroup = useMutation(api.chat.leaveGroupConversation);
  const renameGroup = useMutation(api.chat.renameGroupConversation);

  useEffect(() => {
    setGroupName(conversation.name ?? "");
    setError(null);
  }, [conversation.id, conversation.name]);

  const trimmedGroupName = groupName.trim();
  const nameDirty = trimmedGroupName !== (conversation.name ?? "").trim();

  const memberIds = new Set(members?.map((m) => m.id) ?? []);
  const memberCount = members?.length ?? conversation.memberCount;
  const atCapacity = memberCount >= MAX_GROUP_SIZE;

  async function handleAdd(userId: Id<"users">) {
    setError(null);
    try {
      await addGroupMember({ conversationId: conversation.id, userId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add member");
    }
  }

  async function handleRemove(userId: Id<"users">, name: string) {
    setError(null);
    try {
      await removeGroupMember({ conversationId: conversation.id, userId });
    } catch (e) {
      setError(e instanceof Error ? e.message : `Could not remove ${name}`);
    }
  }

  function confirmRemove(userId: Id<"users">, name: string) {
    Alert.alert(
      "Remove member",
      `Remove ${name} from the group?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => void handleRemove(userId, name),
        },
      ],
    );
  }

  async function handleLeave() {
    setError(null);
    try {
      await leaveGroup({ conversationId: conversation.id });
      router.replace(chatsTabHref());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not leave group");
    }
  }

  function confirmLeave() {
    Alert.alert(
      "Leave group",
      "Leave this group? You won't see new messages unless someone adds you back.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave group",
          style: "destructive",
          onPress: () => void handleLeave(),
        },
      ],
    );
  }

  async function handleRename() {
    if (!nameDirty || renaming) return;
    setRenaming(true);
    setError(null);
    try {
      await renameGroup({
        conversationId: conversation.id,
        name: groupName,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save name");
    } finally {
      setRenaming(false);
    }
  }

  function navigateToProfile(userId: Id<"users">) {
    openProfile(router, userId, user?.id);
  }

  return (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        style={[styles.scroll, { backgroundColor: colors.bg }]}
        contentContainerStyle={styles.scrollContent}
      >
      <Text style={[chatText, styles.subtitle, { color: colors.inkMuted }]}>
        {conversation.title} · {memberCount} people
      </Text>

      {conversation.isCreator ? (
        <View style={styles.block}>
          <Text style={[chatText, styles.label, { color: colors.inkSoft }]}>
            Group name
          </Text>
          <OxInput
            placeholder="e.g. Trinity formal crew"
            value={groupName}
            onChangeText={setGroupName}
            maxLength={MAX_GROUP_NAME_LENGTH}
            editable={!renaming}
          />
          <Text style={[chatText, styles.hint, { color: colors.inkMuted }]}>
            Leave blank to show member names instead.
          </Text>
          <OxButton
            title={renaming ? "Saving…" : "Save name"}
            onPress={() => void handleRename()}
            loading={renaming}
            disabled={!nameDirty}
            dashed
            style={styles.saveNameBtn}
          />
          <DoodleDivider seed={seedFrom(conversation.id)} marginVertical={8} />
        </View>
      ) : null}

      <View style={styles.memberList}>
        {members === undefined ? (
          <OxSpinner size="md" style={styles.loader} />
        ) : (
          members.map((m) => {
            const isSelf = user?.id === m.id;
            const isCreator = conversation.createdByUserId === m.id;
            return (
              <DoodleOutline
                key={m.id}
                seed={seedFrom(m.id)}
                fill={colors.paper}
                stroke={colors.ink}
                dashed
                style={styles.memberRowOutline}
                contentStyle={styles.memberRowInner}
              >
                <Pressable onPress={() => navigateToProfile(m.id)}>
                  <Avatar name={m.name} size={36} />
                </Pressable>
                <Pressable
                  style={styles.memberText}
                  onPress={() => navigateToProfile(m.id)}
                >
                  <Text style={[chatText, { color: colors.ink, fontSize: 15 }]}>
                    {m.name}
                    {isSelf ? " (you)" : ""}
                  </Text>
                  {isCreator ? (
                    <Text style={[chatText, styles.meta, { color: colors.inkSoft }]}>
                      Creator
                    </Text>
                  ) : m.college ? (
                    <Text
                      style={[chatText, styles.meta, { color: colors.inkSoft }]}
                      numberOfLines={1}
                    >
                      {m.college}
                    </Text>
                  ) : null}
                </Pressable>
                {conversation.isCreator && !isSelf ? (
                  <OxButton
                    title="Remove"
                    variant="secondary"
                    onPress={() => confirmRemove(m.id, m.name)}
                    style={styles.removeBtn}
                  />
                ) : null}
              </DoodleOutline>
            );
          })
        )}
      </View>

      {conversation.isCreator ? (
        <View style={styles.block}>
          <DoodleDivider seed={seedFrom(conversation.id) + 3} marginVertical={8} />
          {atCapacity ? (
            <Text style={[chatText, { color: colors.inkSoft, fontSize: 14 }]}>
              Group is full ({MAX_GROUP_SIZE} people max).
            </Text>
          ) : (
            <>
              <Text style={[chatText, styles.label, { color: colors.inkSoft }]}>
                Add member
              </Text>
              <ChatUserSearchField
                excludeIds={memberIds}
                onSelect={(u) => void handleAdd(u.id)}
                clearOnSelect
              />
            </>
          )}
        </View>
      ) : null}

      {error ? (
        <Text style={[chatText, styles.error, { color: colors.danger }]}>
          {error}
        </Text>
      ) : null}

      <View style={styles.leaveBlock}>
        <OxButton
          title="Leave group"
          variant="danger"
          dashed
          onPress={confirmLeave}
        />
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    padding: SCREEN_PADDING,
    paddingBottom: 32,
  },
  subtitle: { fontSize: 14, marginBottom: 12 },
  block: {
    paddingBottom: 8,
    marginBottom: 8,
  },
  leaveBlock: {
    marginTop: 16,
  },
  label: { fontSize: 12, marginBottom: 6, textTransform: "uppercase" },
  hint: { fontSize: 13, marginTop: 6 },
  saveNameBtn: { marginTop: 12 },
  memberList: { gap: 8, marginBottom: 8 },
  loader: { marginVertical: 16 },
  memberRowOutline: {
    alignSelf: "stretch",
  },
  memberRowInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  memberText: { flex: 1, minWidth: 0 },
  meta: { fontSize: 11, marginTop: 2 },
  removeBtn: { paddingHorizontal: 8, minWidth: 0 },
  error: { fontSize: 14, marginBottom: 12 },
});
