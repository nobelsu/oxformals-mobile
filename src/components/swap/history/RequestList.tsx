import { useData } from "@/src/components/data/useData";
import { IncomingRequestRow } from "@/src/components/swap/IncomingRequestRow";
import { SentRequestRow } from "@/src/components/swap/SentRequestRow";
import { oxText } from "@/src/constants/oxText";
import { CARD_GAP } from "@/src/constants/layout";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import type { SwapRequest } from "@/src/lib/data/types";
import { StyleSheet, Text, View } from "react-native";
import type { RequestDirection } from "./constants";

type Props = {
  direction: RequestDirection;
  requests: SwapRequest[];
  emptyMessage?: string;
};

export function RequestList({ direction, requests, emptyMessage }: Props) {
  const { colors } = useOxTheme();
  const { getUser, getListing, withdrawRequest, acceptRequest, declineRequest } =
    useData();

  const defaultEmpty =
    direction === "incoming"
      ? "No incoming requests yet."
      : "No outgoing requests yet.";

  if (requests.length === 0) {
    return (
      <Text style={[oxText, { color: colors.inkMuted, marginTop: 4 }]}>
        {emptyMessage ?? defaultEmpty}
      </Text>
    );
  }

  return (
    <View style={styles.cardList}>
      {requests.map((r) => {
        const targetListing = getListing(r.targetListingId);
        const offeringListing = r.offeringListingId
          ? getListing(r.offeringListingId)
          : undefined;

        if (direction === "outgoing") {
          const toUser = getUser(r.toUserId);
          if (!toUser) return null;
          return (
            <SentRequestRow
              key={r.id}
              request={r}
              direction={direction}
              toUser={toUser}
              targetListing={targetListing}
              offeringListing={offeringListing}
              onWithdraw={(requestId) => withdrawRequest(requestId)}
            />
          );
        }
        const fromUser = getUser(r.fromUserId);
        if (!fromUser) return null;
        return (
          <IncomingRequestRow
            key={r.id}
            request={r}
            direction={direction}
            fromUser={fromUser}
            targetListing={targetListing}
            offeringListing={offeringListing}
            onAccept={(requestId) => acceptRequest(requestId)}
            onDecline={(requestId) => declineRequest(requestId)}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  cardList: { gap: CARD_GAP },
});
