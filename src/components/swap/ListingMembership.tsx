import { useData } from "@/src/components/data/useData";
import { Avatar } from "@/src/components/ui/Avatar";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxText } from "@/src/components/ui/OxText";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import type { Listing } from "@/src/lib/data/types";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, View } from "react-native";

type Props = {
  listing: Listing;
  viewerId: string;
  isPast: boolean;
};

/**
 * Who's coming, for people in the group. The host can remove a guest; a guest
 * can leave. Both are only offered before the formal.
 */
export function ListingMembership({ listing, viewerId, isPast }: Props) {
  const { colors } = useOxTheme();
  const router = useRouter();
  const { getUser, leaveGroup, removeMember } = useData();
  const isOwner = listing.ownerUserId === viewerId;
  const isMember = listing.members.includes(viewerId);
  if (!isMember) return null;

  const guests = listing.members.filter((id) => id !== listing.ownerUserId);
  const extraFor = (userId: string) =>
    listing.guestSeats?.find((g) => g.userId === userId)?.count ?? 0;

  function confirmRemove(userId: string, name: string) {
    Alert.alert(
      `Remove ${name}?`,
      "They lose their seat and are told. Any credit they spent is refunded, and if this was a swap you give up the seat you got at their formal.",
      [
        { text: "Keep them", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeMember(listing.id, userId),
        },
      ],
    );
  }

  function confirmLeave() {
    Alert.alert(
      "Leave this formal?",
      "Your seat goes back to the host and any credit you spent is refunded. If this was a swap, your guest keeps their seat at your formal.",
      [
        { text: "Stay", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => {
            leaveGroup(listing.id);
            router.back();
          },
        },
      ],
    );
  }

  return (
    <View style={styles.wrap}>
      {isOwner && guests.length > 0 ? (
        <>
          <OxText style={[styles.heading, { color: colors.ink, fontFamily: FONT_DISPLAY }]}>
            Your guests
          </OxText>
          {guests.map((id) => {
            const guest = getUser(id);
            const name = guest?.name ?? "Guest";
            const extra = extraFor(id);
            return (
              <View key={id} style={styles.row}>
                <Pressable
                  style={styles.person}
                  onPress={() => router.push(`/profile/${id}`)}
                  accessibilityRole="button"
                >
                  <Avatar avatar={guest?.avatar} name={name} size={32} />
                  <OxText numberOfLines={1} style={[styles.name, { color: colors.ink }]}>
                    {name}
                    {extra > 0 ? ` + ${extra} guest${extra === 1 ? "" : "s"}` : ""}
                  </OxText>
                </Pressable>
                {!isPast ? (
                  <Pressable
                    onPress={() => confirmRemove(id, name.split(" ")[0])}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${name}`}
                  >
                    <Ionicons name="close-circle-outline" size={22} color={colors.inkMuted} />
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </>
      ) : null}
      {!isOwner && !isPast ? (
        <OxButton title="Leave this formal" variant="secondary" onPress={confirmLeave} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 20, gap: 8 },
  heading: { fontSize: 20, textTransform: "uppercase" },
  row: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 40 },
  person: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  name: { fontSize: 16, flexShrink: 1 },
});
