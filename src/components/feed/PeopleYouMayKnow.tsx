import { api } from "@/convex/_generated/api";
import { Avatar } from "@/src/components/ui/Avatar";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxText } from "@/src/components/ui/OxText";
import { SketchCard } from "@/src/components/ui/SketchCard";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { errorMessage } from "@/src/lib/errorMessage";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, View } from "react-native";

/** Why this person is suggested, strongest reason first. */
function reason(p: { mutualFriends: number; sharedFormals: number; sameCollege: boolean }) {
  if (p.mutualFriends > 0) {
    return `${p.mutualFriends} mutual friend${p.mutualFriends === 1 ? "" : "s"}`;
  }
  if (p.sharedFormals > 0) return "You've been to a formal together";
  return p.sameCollege ? "At your college" : "";
}

/** A few people worth following, on the Following tab. Hidden when there are none. */
export function PeopleYouMayKnow() {
  const { colors } = useOxTheme();
  const router = useRouter();
  const people = useQuery(api.peopleYouMayKnow.getPeopleYouMayKnow, { limit: 4 });
  const follow = useMutation(api.follows.follow);
  if (!people || people.length === 0) return null;

  return (
    <SketchCard seed={83} padding={14} tilt={0.001}>
      <OxText style={[styles.title, { color: colors.ink }]}>People you may know</OxText>
      {people.map((p) => (
        <View key={p.user._id} style={styles.row}>
          <Pressable
            style={styles.person}
            onPress={() => router.push(`/profile/${p.user._id}`)}
            accessibilityRole="button"
          >
            <Avatar avatar={p.user.avatar} name={p.user.name ?? "?"} size={36} />
            <View style={styles.text}>
              <OxText numberOfLines={1} style={[styles.name, { color: colors.ink }]}>
                {p.user.name ?? "Someone"}
              </OxText>
              <OxText numberOfLines={1} style={[styles.why, { color: colors.inkMuted }]}>
                {reason(p) || p.user.college || ""}
              </OxText>
            </View>
          </Pressable>
          <OxButton
            title="Follow"
            variant="secondary"
            onPress={() => {
              follow({ userId: p.user._id }).catch((error) =>
                Alert.alert("Couldn't follow them", errorMessage(error)),
              );
            }}
          />
        </View>
      ))}
    </SketchCard>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, textTransform: "uppercase", marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52 },
  person: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  text: { flex: 1 },
  name: { fontSize: 16 },
  why: { fontSize: 13 },
});
