import { useAuth } from "@/src/components/auth/useAuth";
import { Avatar } from "@/src/components/ui/Avatar";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxText } from "@/src/components/ui/OxText";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { SECTION_GAP } from "@/src/constants/layout";
import { oxText } from "@/src/constants/oxText";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import type { User } from "@/src/lib/auth/types";
import { chatConversationHref } from "@/src/lib/chat/navigation";
import { formatRelativeTime } from "@/src/lib/data/format";
import { resolveRequestType } from "@/src/lib/data/requestFilters";
import type { Listing, SwapRequest } from "@/src/lib/data/types";
import { openProfile } from "@/src/lib/profile/navigation";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ListingCard } from "./ListingCard";
import { RequestTypeTag } from "./RequestTypeTag";

type Props = {
  request: SwapRequest;
  isIncoming: boolean;
  counterparty: User;
  targetListing: Listing | undefined;
  offeringListing: Listing | undefined;
  getUser: (userId: string) => User | undefined;
  onAccept?: () => void;
  onDecline?: () => void;
  onWithdraw?: () => void;
};

function statusLabel(status: SwapRequest["status"]): string {
  if (status === "pending") return "Pending";
  if (status === "accepted") return "Accepted";
  return "Declined";
}

function listingMemberUsers(
  listing: Listing,
  getUser: (userId: string) => User | undefined,
): User[] {
  return (listing.members ?? [])
    .filter((mid) => mid !== listing.ownerUserId)
    .map(getUser)
    .filter((u): u is User => !!u);
}

export function RequestDetailContent({
  request,
  isIncoming,
  counterparty,
  targetListing,
  offeringListing,
  getUser,
  onAccept,
  onDecline,
  onWithdraw,
}: Props) {
  const router = useRouter();
  const { colors } = useOxTheme();
  const { user: currentUser } = useAuth();
  const [messaging, setMessaging] = useState(false);
  const getOrCreateConversation = useMutation(api.chat.getOrCreateConversation);

  const requestType = resolveRequestType(request);

  const openMessage = useCallback(async () => {
    setMessaging(true);
    try {
      const conversationId = await getOrCreateConversation({
        otherUserId: counterparty.id as Id<"users">,
      });
      router.push(chatConversationHref(conversationId));
    } finally {
      setMessaging(false);
    }
  }, [getOrCreateConversation, router, counterparty.id]);

  const openListing = (listingId: string) => {
    router.push(`/listing/${listingId}`);
  };

  const targetOwner = targetListing ? getUser(targetListing.ownerUserId) : undefined;
  const offeringOwner = offeringListing
    ? getUser(offeringListing.ownerUserId)
    : undefined;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable
          onPress={() =>
            openProfile(router, counterparty.id, currentUser?.id)
          }
          style={styles.avatarPress}
        >
          <Avatar
            avatar={counterparty.avatar}
            name={counterparty.name}
            size={56}
          />
        </Pressable>
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <Pressable
              onPress={() =>
                openProfile(router, counterparty.id, currentUser?.id)
              }
              style={styles.namePress}
            >
              <Text
                style={[styles.name, oxText, { color: colors.ink }]}
                numberOfLines={2}
              >
                {counterparty.name}
              </Text>
            </Pressable>
            <View style={styles.tags}>
              <RequestTypeTag requestType={requestType} />
              <View style={[styles.statusChip, { borderColor: colors.ink }]}>
                <Text style={[styles.statusText, oxText, { color: colors.ink }]}>
                  {statusLabel(request.status)}
                </Text>
              </View>
            </View>
          </View>
          <Text style={[oxText, { color: colors.inkSoft, fontSize: 13 }]}>
            {isIncoming ? "Received" : "Sent"}{" "}
            {formatRelativeTime(request.createdAt)}
          </Text>
        </View>
      </View>

      {request.message ? (
        <View style={styles.section}>
          <OxText
            style={[
              styles.sectionLabel,
              { color: colors.ink, fontFamily: FONT_DISPLAY },
            ]}
          >
            Message
          </OxText>
          <Text style={[styles.message, oxText, { color: colors.inkSoft }]}>
            {`"${request.message}"`}
          </Text>
        </View>
      ) : null}

      {targetListing && targetOwner ? (
        <View style={styles.section}>
          <OxText
            style={[
              styles.sectionLabel,
              { color: colors.ink, fontFamily: FONT_DISPLAY },
            ]}
          >
            {isIncoming ? "Your listing" : "Their listing"}
          </OxText>
          <ListingCard
            listing={targetListing}
            owner={targetOwner}
            memberUsers={listingMemberUsers(targetListing, getUser)}
            variant="compact"
            hideFooter
            onPress={() => openListing(targetListing.id)}
          />
        </View>
      ) : null}

      {offeringListing && offeringOwner ? (
        <View style={styles.section}>
          <OxText
            style={[
              styles.sectionLabel,
              { color: colors.ink, fontFamily: FONT_DISPLAY },
            ]}
          >
            {isIncoming ? "Their offering" : "Your offering"}
          </OxText>
          <ListingCard
            listing={offeringListing}
            owner={offeringOwner}
            memberUsers={listingMemberUsers(offeringListing, getUser)}
            variant="compact"
            hideFooter
            onPress={() => openListing(offeringListing.id)}
          />
        </View>
      ) : null}

      <View style={styles.actions}>
        <OxButton
          title="Message"
          variant="secondary"
          loading={messaging}
          onPress={() => void openMessage()}
          style={styles.actionBtn}
        />
        {request.status === "pending" && isIncoming && onAccept ? (
          <OxButton title="Accept" onPress={onAccept} style={styles.actionBtn} />
        ) : null}
        {request.status === "pending" && isIncoming && onDecline ? (
          <OxButton
            title="Decline"
            variant="secondary"
            onPress={onDecline}
            style={styles.actionBtn}
          />
        ) : null}
        {request.status === "pending" && !isIncoming && onWithdraw ? (
          <OxButton title="Withdraw" onPress={onWithdraw} style={styles.actionBtn} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: SECTION_GAP },
  header: { flexDirection: "row", gap: 14 },
  avatarPress: { flexShrink: 0 },
  headerText: { flex: 1, minWidth: 0, gap: 6 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  namePress: { flex: 1, minWidth: 0 },
  name: { fontSize: 22 },
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
  section: { gap: 10 },
  sectionLabel: {
    fontSize: 18,
    textTransform: "uppercase",
  },
  message: { fontSize: 16, lineHeight: 24 },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  actionBtn: { alignSelf: "flex-start" },
});
