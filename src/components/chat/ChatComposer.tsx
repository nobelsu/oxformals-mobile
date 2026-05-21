import { chatText } from "@/src/components/chat/chatText";
import { ListingReferenceCard } from "@/src/components/chat/ListingReferenceCard";
import { KeyboardDismissPanArea } from "@/src/components/chat/KeyboardDismissStrip";
import { ListingReferencePicker } from "@/src/components/chat/ListingReferencePicker";
import {
  MentionComposer,
  type MentionComposerHandle,
} from "@/src/components/chat/MentionComposer";
import { MessageReplyQuote } from "@/src/components/chat/MessageReplyQuote";
import { DoodleAddButton } from "@/src/components/ui/DoodleAddButton";
import { DoodleSendButton } from "@/src/components/ui/DoodleSendButton";
import { SketchCard } from "@/src/components/ui/SketchCard";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import {
  buildReplySnapshotFromMessage,
  replyTargetSenderLabel,
} from "@/src/lib/chat/replyPreview";
import {
  detectListingLinkSuggestion,
  stripListingLinksFromText,
} from "@/src/lib/chat/listingLink";
import {
  formatListingDate,
  formatListingStatusLabel,
} from "@/src/lib/data/format";
import type { MentionParticipant } from "@/src/lib/chat/mentions";
import type { ChatMention, ChatMessage, ListingSummary } from "@/src/lib/chat/types";
import { useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  InteractionManager,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { buildWavyLinePath, STROKE_WIDTH } from "@/src/lib/ui/sketchStroke";

type SendArgs = {
  body: string;
  mentions?: ChatMention[];
  referencedListingId?: Id<"listings">;
  replyToMessageId?: Id<"messages">;
};

type Props = {
  conversationId: Id<"conversations">;
  defaultMentionUsers?: MentionParticipant[];
  currentUserId?: Id<"users">;
  replyTarget?: ChatMessage | null;
  keyboardVisible?: boolean;
  onCancelReply?: () => void;
  onListingPress?: (listingId: Id<"listings">) => void;
  onSend: (args: SendArgs) => Promise<void>;
  sending?: boolean;
  composerStyle?: StyleProp<ViewStyle>;
  onComposerLayout?: (width: number) => void;
};

export function ChatComposer({
  conversationId,
  defaultMentionUsers,
  currentUserId,
  replyTarget,
  keyboardVisible = false,
  onCancelReply,
  onListingPress,
  onSend,
  sending = false,
  composerStyle,
  onComposerLayout,
}: Props) {
  const { colors } = useOxTheme();
  const [draftBody, setDraftBody] = useState("");
  const [editorEmpty, setEditorEmpty] = useState(true);
  const [pendingListingRef, setPendingListingRef] =
    useState<ListingSummary | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [composerWidth, setComposerWidth] = useState(0);
  const composerRef = useRef<MentionComposerHandle>(null);
  const refocusInputAfterPickerRef = useRef(false);

  const referableListings = useQuery(api.chat.listReferableListings, {
    conversationId,
  });

  const referableById = useMemo(() => {
    const map = new Map<string, ListingSummary>();
    for (const listing of referableListings ?? []) {
      map.set(listing.id, listing);
    }
    return map;
  }, [referableListings]);

  useEffect(() => {
    if (replyTarget) {
      composerRef.current?.focus();
    }
  }, [replyTarget]);

  const linkSuggestion = useMemo(() => {
    if (pendingListingRef) return null;
    return detectListingLinkSuggestion(draftBody, referableById);
  }, [draftBody, pendingListingRef, referableById]);

  const acceptLinkSuggestion = useCallback(() => {
    if (!linkSuggestion) return;
    setPendingListingRef(linkSuggestion);
    const next = stripListingLinksFromText(draftBody);
    composerRef.current?.setPlainText(next);
    setDraftBody(next);
    composerRef.current?.focus();
  }, [linkSuggestion, draftBody]);

  const canSend = Boolean(draftBody.trim() || pendingListingRef);

  const refocusInput = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        composerRef.current?.focus();
      });
    });
  }, []);

  const handlePickerClose = useCallback(() => {
    setPickerOpen(false);
    if (refocusInputAfterPickerRef.current) {
      refocusInputAfterPickerRef.current = false;
      refocusInput();
    }
  }, [refocusInput]);

  const handleSend = useCallback(async () => {
    if (!canSend || sending) return;
    const serialized = composerRef.current?.serialize() ?? {
      body: "",
      mentions: [],
    };
    const text = serialized.body.trim();
    if (!text && !pendingListingRef) return;
    await onSend({
      body: text,
      ...(serialized.mentions.length > 0
        ? { mentions: serialized.mentions }
        : {}),
      ...(pendingListingRef
        ? { referencedListingId: pendingListingRef.id }
        : {}),
      ...(replyTarget ? { replyToMessageId: replyTarget.id } : {}),
    });
    composerRef.current?.clear();
    setDraftBody("");
    setEditorEmpty(true);
    setPendingListingRef(null);
    onCancelReply?.();
    composerRef.current?.focus();
  }, [
    canSend,
    onCancelReply,
    onSend,
    pendingListingRef,
    replyTarget,
    sending,
  ]);

  const composerLine =
    composerWidth > 0 ? buildWavyLinePath(composerWidth, 88) : "";

  return (
    <View
      style={[styles.composer, composerStyle]}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        setComposerWidth(w);
        onComposerLayout?.(w);
      }}
    >
      <KeyboardDismissPanArea enabled={keyboardVisible}>
        {replyTarget ? (
          <MessageReplyQuote
            reply={buildReplySnapshotFromMessage(replyTarget)}
            senderLabel={replyTargetSenderLabel(replyTarget, currentUserId)}
            variant="composer"
            onListingPress={
              replyTarget.referencedListing ? onListingPress : undefined
            }
            onCancel={onCancelReply}
          />
        ) : null}

        {linkSuggestion && !pendingListingRef ? (
          <Pressable
            onPress={acceptLinkSuggestion}
            accessibilityRole="button"
            accessibilityLabel="Attach listing from link"
            style={({ pressed }) => [
              styles.linkSuggestionPressable,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <SketchCard seed={77} padding={10} style={styles.linkSuggestion}>
              <Text
                style={[chatText, styles.linkHint, { color: colors.inkMuted }]}
              >
                Tap to attach{" "}
                <Text style={{ color: colors.ink }}>
                  {linkSuggestion.ownerName}&apos;s {linkSuggestion.college}
                </Text>
                {" · "}
                {formatListingDate(linkSuggestion.dateTime)}
                {" · "}
                {formatListingStatusLabel(
                  linkSuggestion.status,
                  linkSuggestion.seatsAvailable,
                )}
              </Text>
            </SketchCard>
          </Pressable>
        ) : null}

        {pendingListingRef ? (
          <View style={styles.pendingRow}>
            <View style={styles.pendingCard}>
              <ListingReferenceCard
                listing={pendingListingRef}
                compact
                onPress={
                  onListingPress
                    ? () => onListingPress(pendingListingRef.id)
                    : undefined
                }
              />
            </View>
            <Pressable
              onPress={() => setPendingListingRef(null)}
              accessibilityRole="button"
              accessibilityLabel="Remove listing attachment"
              hitSlop={8}
            >
              <Text
                style={[chatText, styles.remove, { color: colors.inkMuted }]}
              >
                Remove
              </Text>
            </Pressable>
          </View>
        ) : null}
      </KeyboardDismissPanArea>

      {composerWidth > 0 && (
        <Svg
          width={composerWidth}
          height={10}
          style={styles.composerLine}
          pointerEvents="none"
        >
          <Path
            d={composerLine}
            fill="none"
            stroke={colors.ink}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            opacity={0.5}
          />
        </Svg>
      )}

      <View style={styles.composerRow}>
        <DoodleAddButton
          seed={98}
          accessibilityLabel="Attach listing"
          onPress={() => {
            refocusInputAfterPickerRef.current = true;
            Keyboard.dismiss();
            setPickerOpen(true);
          }}
          size={44}
        />
        <MentionComposer
          ref={composerRef}
          defaultMentionUsers={defaultMentionUsers}
          placeholder="@ to mention someone"
          onBodyChange={setDraftBody}
          onEmptyChange={setEditorEmpty}
          wrapperStyle={styles.inputWrap}
          compact
          seed={99}
        />
        <DoodleSendButton
          accessibilityLabel="Send message"
          loading={sending}
          seed={100}
          disabled={editorEmpty && !pendingListingRef}
          onPress={handleSend}
        />
      </View>

      <ListingReferencePicker
        visible={pickerOpen}
        onClose={handlePickerClose}
        conversationId={conversationId}
        onSelect={setPendingListingRef}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  composer: {
    paddingTop: 12,
    position: "relative",
  },
  composerLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  linkSuggestionPressable: {
    marginBottom: 8,
  },
  linkSuggestion: {
    width: "100%",
  },
  linkHint: {
    fontSize: 12,
  },
  pendingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  pendingCard: {
    flex: 1,
    minWidth: 0,
  },
  remove: {
    fontSize: 12,
    textDecorationLine: "underline",
    flexShrink: 0,
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inputWrap: {
    flex: 1,
    minWidth: 0,
  },
});
