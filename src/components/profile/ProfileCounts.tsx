import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Avatar } from "@/src/components/ui/Avatar";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxModal } from "@/src/components/ui/OxModal";
import { OxSpinner } from "@/src/components/ui/OxSpinner";
import { OxText } from "@/src/components/ui/OxText";
import { space } from "@/src/constants/spacing";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { errorMessage } from "@/src/lib/errorMessage";
import { openProfile } from "@/src/lib/profile/navigation";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

type Direction = "followers" | "following";

type Props = {
  userId: Id<"users">;
  /** null while loading or hidden (private account). */
  formals: number | null;
  reviews: number | null;
  followers: number | null;
  following: number | null;
  /** Whether the viewer may open the follower lists. */
  canOpenLists: boolean;
  isSelf: boolean;
  viewerId?: string;
};

function format(n: number | null): string {
  return n === null ? "–" : n > 500 ? "500+" : String(n);
}

/** The one counts row: formals, reviews, followers, following. */
export function ProfileCounts({
  userId,
  formals,
  reviews,
  followers,
  following,
  canOpenLists,
  isSelf,
  viewerId,
}: Props) {
  const { colors } = useOxTheme();
  const [list, setList] = useState<Direction>("followers");
  const [listOpen, setListOpen] = useState(false);

  const cells: { value: number | null; label: string; open?: Direction }[] = [
    { value: formals, label: formals === 1 ? "formal" : "formals" },
    { value: reviews, label: reviews === 1 ? "review" : "reviews" },
    { value: followers, label: followers === 1 ? "follower" : "followers", open: "followers" },
    { value: following, label: "following", open: "following" },
  ];

  return (
    <>
      <View style={styles.row}>
        {cells.map((cell) => {
          const direction = canOpenLists ? cell.open : undefined;
          return (
            <Pressable
              key={cell.label}
              style={styles.cell}
              disabled={!direction}
              onPress={() => {
                if (!direction) return;
                setList(direction);
                setListOpen(true);
              }}
              accessibilityRole={direction ? "button" : "text"}
              accessibilityLabel={`${format(cell.value)} ${cell.label}`}
            >
              <OxText style={[styles.value, { color: colors.ink }]}>{format(cell.value)}</OxText>
              <OxText style={[styles.label, { color: colors.inkMuted }]}>{cell.label}</OxText>
            </Pressable>
          );
        })}
      </View>
      <OxModal
        visible={listOpen}
        onClose={() => setListOpen(false)}
        title={list === "followers" ? "Followers" : "Following"}
      >
        {listOpen ? (
          <FollowList
            userId={userId}
            direction={list}
            canRemove={isSelf && list === "followers"}
            viewerId={viewerId}
            onNavigate={() => setListOpen(false)}
          />
        ) : null}
      </OxModal>
    </>
  );
}

function FollowList({
  userId,
  direction,
  canRemove,
  viewerId,
  onNavigate,
}: {
  userId: Id<"users">;
  direction: Direction;
  canRemove: boolean;
  viewerId?: string;
  onNavigate: () => void;
}) {
  const { colors } = useOxTheme();
  const router = useRouter();
  const people = useQuery(api.follows.listFollows, { userId, direction });
  const removeFollower = useMutation(api.follows.removeFollower);

  if (people === undefined) {
    return (
      <View style={styles.empty}>
        <OxSpinner />
      </View>
    );
  }

  if (people === null || people.length === 0) {
    return (
      <OxText style={[styles.empty, styles.emptyText, { color: colors.inkMuted }]}>
        {people === null
          ? "This account is private."
          : direction === "followers"
            ? "No followers yet"
            : "Not following anyone yet"}
      </OxText>
    );
  }

  return (
    <View style={styles.people}>
      {people.map((person) => {
        const name = person.name ?? "Someone";
        return (
          <View key={person._id} style={styles.personRow}>
            <Pressable
              style={styles.person}
              onPress={() => {
                onNavigate();
                openProfile(router, person._id, viewerId);
              }}
              accessibilityRole="button"
            >
              <Avatar avatar={person.avatar} name={name} size={38} />
              <View style={styles.personText}>
                <OxText numberOfLines={1} style={[styles.name, { color: colors.ink }]}>
                  {name}
                </OxText>
                {person.college ? (
                  <OxText numberOfLines={1} style={[styles.label, { color: colors.inkMuted }]}>
                    {person.college}
                  </OxText>
                ) : null}
              </View>
            </Pressable>
            {canRemove ? (
              <OxButton
                title="Remove"
                variant="secondary"
                onPress={() =>
                  Alert.alert(`Remove ${name.trim().split(" ")[0]}?`, undefined, [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Remove",
                      style: "destructive",
                      onPress: () => {
                        removeFollower({ userId: person._id }).catch((error) =>
                          Alert.alert("Couldn't remove them", errorMessage(error)),
                        );
                      },
                    },
                  ])
                }
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row" },
  cell: { flex: 1, alignItems: "center", paddingVertical: space[1] },
  value: { fontSize: 22, lineHeight: 26 },
  label: { fontSize: 13, lineHeight: 17 },
  empty: { alignItems: "center", paddingVertical: space[5] },
  emptyText: { fontSize: 16, textAlign: "center" },
  people: { gap: space[3], paddingBottom: space[2] },
  personRow: { flexDirection: "row", alignItems: "center", gap: space[2] },
  person: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  personText: { flex: 1 },
  name: { fontSize: 16 },
});
