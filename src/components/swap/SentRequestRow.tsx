import { Avatar } from "@/src/components/ui/Avatar";
import { OxButton } from "@/src/components/ui/OxButton";
import { SketchCard } from "@/src/components/ui/SketchCard";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { oxText } from "@/src/constants/oxText";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import type { User } from "@/src/lib/auth/types";
import { chatConversationHref } from "@/src/lib/chat/navigation";
import { requestDetailHref } from "@/src/lib/request/navigation";
import { formatRelativeTime } from "@/src/lib/data/format";
import {
  formatRequestRowAccessibilityLabel,
  getRequestRowFormals,
} from "@/src/lib/data/requestDisplay";
import { resolveRequestType } from "@/src/lib/data/requestFilters";
import type { Listing, SwapRequest } from "@/src/lib/data/types";
import type { RequestDirection } from "@/src/components/swap/history/constants";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { RequestRowFormals } from "./RequestRowFormals";
import { RequestTypeTag } from "./RequestTypeTag";

type Props = {
  request: SwapRequest;
  direction: RequestDirection;
  toUser: User;
  targetListing: Listing | undefined;
  offeringListing?: Listing;
  onWithdraw?: (requestId: string) => void;
};

function seedFrom(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function statusLabel(status: SwapRequest["status"]): string {
  if (status === "pending") return "Pending";
  if (status === "accepted") return "Accepted";
  return "Declined";
}

export function SentRequestRow({
  request,
  direction,
  toUser,
  targetListing,
  offeringListing,
  onWithdraw,
}: Props) {
  const router = useRouter();
  const { colors } = useOxTheme();
  const [messaging, setMessaging] = useState(false);
  const getOrCreateConversation = useMutation(api.chat.getOrCreateConversation);

  const requestType = resolveRequestType(request);
  const formalSlots = getRequestRowFormals({
    requestType,
    direction,
    targetListing,
    offeringListing,
  });
  const formalsA11y = formatRequestRowAccessibilityLabel(formalSlots);

  const openMessage = useCallback(async () => {
    setMessaging(true);
    try {
      const conversationId = await getOrCreateConversation({
        otherUserId: toUser.id as Id<"users">,
      });
      router.push(chatConversationHref(conversationId));
    } finally {
      setMessaging(false);
    }
  }, [getOrCreateConversation, router, toUser.id]);

  return (
    <SketchCard seed={seedFrom(request.id)} padding={16}>
      <Pressable
        onPress={() => router.push(requestDetailHref(request.id))}
        accessibilityRole="button"
        accessibilityLabel={
          formalsA11y
            ? `View request to ${toUser.name}, ${formalsA11y}`
            : `View request to ${toUser.name}`
        }
      >
        <View style={styles.headerRow}>
          <View style={styles.avatarCol}>
            <Avatar avatar={toUser.avatar} name={toUser.name} size={48} />
          </View>
          <View style={styles.headerCol}>
            <View style={styles.titleRow}>
              <Text
                style={[styles.name, oxText, { color: colors.ink }]}
                numberOfLines={1}
              >
                {toUser.name}
              </Text>
              <View style={styles.tags}>
                <RequestTypeTag requestType={requestType} />
                <View style={[styles.statusChip, { borderColor: colors.ink }]}>
                  <Text style={[styles.statusText, oxText, { color: colors.ink }]}>
                    {statusLabel(request.status)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
        <RequestRowFormals slots={formalSlots} />
        <Text style={[oxText, styles.timestamp, { color: colors.inkSoft }]}>
          Sent {formatRelativeTime(request.createdAt)}
        </Text>
      </Pressable>
      <View style={styles.actions}>
        <OxButton
          title="Message"
          variant="secondary"
          loading={messaging}
          onPress={() => void openMessage()}
          style={styles.actionBtn}
        />
        {request.status === "pending" && onWithdraw ? (
          <OxButton
            title="Withdraw"
            onPress={() => onWithdraw(request.id)}
            style={styles.actionBtn}
          />
        ) : null}
      </View>
    </SketchCard>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", gap: 12 },
  avatarCol: { flexShrink: 0 },
  headerCol: { flex: 1, minWidth: 0 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  name: { flex: 1, minWidth: 0, fontSize: 18 },
  timestamp: { fontSize: 12, marginTop: 6 },
  tags: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 6,
    alignItems: "center",
    flexShrink: 0,
  },
  statusChip: {
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  actionBtn: { alignSelf: "flex-start" },
});
