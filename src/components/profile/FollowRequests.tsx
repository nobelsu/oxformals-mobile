import { api } from "@/convex/_generated/api";
import { Avatar } from "@/src/components/ui/Avatar";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxText } from "@/src/components/ui/OxText";
import { space } from "@/src/constants/spacing";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { errorMessage } from "@/src/lib/errorMessage";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, View } from "react-native";

function fail(title: string) {
  return (error: unknown) => Alert.alert(title, errorMessage(error));
}

/** People asking to follow you (private accounts). Hidden when there are none. */
export function FollowRequests() {
  const { colors } = useOxTheme();
  const router = useRouter();
  const requests = useQuery(api.follows.listFollowRequests, {});
  const approve = useMutation(api.follows.approveFollower);
  const remove = useMutation(api.follows.removeFollower);

  if (!requests || requests.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <OxText style={[styles.title, { color: colors.ink }]}>Follow requests</OxText>
      {requests.map((person) => (
        <View key={person._id} style={styles.row}>
          <Pressable
            style={styles.person}
            onPress={() => router.push(`/profile/${person._id}`)}
            accessibilityRole="button"
          >
            <Avatar avatar={person.avatar} name={person.name ?? "?"} size={34} />
            <OxText numberOfLines={1} style={[styles.name, { color: colors.ink }]}>
              {person.name ?? "Someone"}
            </OxText>
          </Pressable>
          <OxButton
            title="Approve"
            onPress={() => {
              approve({ userId: person._id }).catch(fail("Couldn't approve them"));
            }}
          />
          <OxButton
            title="Decline"
            variant="secondary"
            onPress={() => {
              remove({ userId: person._id }).catch(fail("Couldn't decline them"));
            }}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[2] },
  title: { fontSize: 20, textTransform: "uppercase" },
  row: { flexDirection: "row", alignItems: "center", gap: space[2] },
  person: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  name: { fontSize: 16, flexShrink: 1 },
});
