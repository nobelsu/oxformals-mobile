import { useData } from "@/src/components/data/useData";
import { OxText } from "@/src/components/ui/OxText";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import {
  partySuffix,
  paymentSummary,
  requestSeatCount,
  unconfirmedPayers,
  unjoinedLinks,
} from "@/src/lib/data/party";
import type { SwapRequest } from "@/src/lib/data/types";
import { StyleSheet, View } from "react-native";

type Props = {
  request: SwapRequest;
  /** The target listing's price, for the cash part of the summary. */
  price?: number;
};

/** Why a host can't accept a group request yet, or null when they can. */
export function partyWaitingReason(
  request: SwapRequest,
  nameOf: (userId: string) => string | undefined,
): string | null {
  if (request.status !== "pending") return null;
  const unconfirmed = unconfirmedPayers(request);
  if (unconfirmed.length > 0) {
    const first = nameOf(unconfirmed[0])?.split(" ")[0] ?? "a friend";
    return unconfirmed.length === 1
      ? `Waiting for ${first} to confirm they're coming`
      : `Waiting for ${unconfirmed.length} people to confirm they're coming`;
  }
  const links = unjoinedLinks(request);
  if (links > 0) {
    return `Waiting for ${links} ${links === 1 ? "person" : "people"} to join Oxformals`;
  }
  return null;
}

/** "3 seats + Priya and 1 guest · 2 credits · £25" for a group request. */
export function RequestPartyNote({ request, price }: Props) {
  const { colors } = useOxTheme();
  const { getUser } = useData();
  const seats = requestSeatCount(request);
  if (seats <= 1) return null;
  const nameOf = (id: string) => getUser(id)?.name;
  const waiting = partyWaitingReason(request, nameOf);
  return (
    <View style={styles.wrap}>
      <OxText style={[styles.line, { color: colors.ink }]}>
        {seats} seats {partySuffix(request, nameOf)}
      </OxText>
      <OxText style={[styles.sub, { color: colors.inkMuted }]}>
        {paymentSummary(request, price)}
      </OxText>
      {waiting ? (
        <OxText style={[styles.sub, { color: colors.danger }]}>{waiting}</OxText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8, gap: 2 },
  line: { fontSize: 15 },
  sub: { fontSize: 13 },
});
