import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Avatar } from "@/src/components/ui/Avatar";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxText } from "@/src/components/ui/OxText";
import { SketchCard } from "@/src/components/ui/SketchCard";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { formatListingDate, formatPrice } from "@/src/lib/data/format";
import { errorMessage } from "@/src/lib/errorMessage";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

/** Group requests a friend put you in: say you're coming, or bow out. */
export function PartyInvites() {
  const { colors } = useOxTheme();
  const invites = useQuery(api.partyInvites.listMyPartyInvites, {});
  const respond = useMutation(api.partyInvites.respondToPartyInvite);
  const [busy, setBusy] = useState<string | null>(null);

  if (!invites || invites.length === 0) return null;

  async function answer(requestId: Id<"requests">, response: "in" | "out") {
    setBusy(requestId);
    try {
      await respond({ requestId, response });
    } catch (error) {
      Alert.alert("Couldn't send that", errorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={styles.list}>
      {invites.map((inv) => {
        const from = inv.from.name?.split(" ")[0] ?? "A friend";
        const cost = inv.paysOwn
          ? inv.method === "credit"
            ? "You pay 1 credit"
            : inv.price !== null
              ? `You pay ${formatPrice(inv.price)}`
              : "You pay the host"
          : `${from} is covering you`;
        return (
          <SketchCard key={inv.requestId} seed={inv.requestId.length + 13} padding={14} tilt={0.001}>
            <View style={styles.head}>
              <Avatar avatar={inv.from.avatar} name={inv.from.name ?? from} size={34} />
              <View style={styles.text}>
                <OxText style={[styles.title, { color: colors.ink }]}>
                  {from} wants to bring you to {inv.college}
                </OxText>
                <OxText style={[styles.sub, { color: colors.inkMuted }]}>
                  {formatListingDate(inv.dateTime)} · {inv.seats} seats · {cost}
                </OxText>
              </View>
            </View>
            <View style={styles.actions}>
              {inv.response === "in" ? (
                <OxText style={[styles.title, { color: colors.ink, flex: 1 }]}>
                  You&apos;re in. Waiting on the host.
                </OxText>
              ) : (
                <OxButton
                  title="I'm in"
                  loading={busy === inv.requestId}
                  onPress={() => void answer(inv.requestId, "in")}
                />
              )}
              <OxButton
                title="Not me"
                variant="secondary"
                disabled={busy === inv.requestId}
                onPress={() => void answer(inv.requestId, "out")}
              />
            </View>
          </SketchCard>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  head: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  text: { flex: 1 },
  title: { fontSize: 16, lineHeight: 20 },
  sub: { fontSize: 13, marginTop: 2 },
  actions: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
});
