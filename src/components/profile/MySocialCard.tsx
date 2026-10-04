import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Avatar } from "@/src/components/ui/Avatar";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxText } from "@/src/components/ui/OxText";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { errorMessage } from "@/src/lib/errorMessage";
import { WEB_ORIGIN } from "@/src/lib/webOrigin";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, Share, StyleSheet, View } from "react-native";

function fail(title: string) {
  return (error: unknown) => Alert.alert(title, errorMessage(error));
}

/**
 * Your follower counts, the people asking to follow you (private accounts),
 * and the invite and share buttons.
 */
export function MySocialCard({ userId, name }: { userId: string; name: string }) {
  const { colors } = useOxTheme();
  const router = useRouter();
  const id = userId as Id<"users">;
  const state = useQuery(api.follows.getFollowState, { userId: id });
  const requests = useQuery(api.follows.listFollowRequests, {});
  const approve = useMutation(api.follows.approveFollower);
  const remove = useMutation(api.follows.removeFollower);
  const getInviteCode = useMutation(api.invites.getOrCreateMyInviteCode);
  const [inviting, setInviting] = useState(false);

  async function invite() {
    if (inviting) return;
    setInviting(true);
    try {
      const code = await getInviteCode({});
      await Share.share({ message: `Join me on Oxformals!\n${WEB_ORIGIN}/i/${code}` });
    } catch (error) {
      fail("Couldn't make your invite link")(error);
    } finally {
      setInviting(false);
    }
  }

  function shareProfile() {
    Share.share({
      message: `${name} on Oxformals\n${WEB_ORIGIN}/profile/${userId}`,
    }).catch(() => {});
  }

  return (
    <View style={styles.wrap}>
      {state ? (
        <OxText style={[styles.counts, { color: colors.inkMuted }]}>
          {state.followers} follower{state.followers === 1 ? "" : "s"} ·{" "}
          {state.followingCount} following
        </OxText>
      ) : null}

      {requests && requests.length > 0 ? (
        <View style={styles.requests}>
          <OxText style={[styles.title, { color: colors.ink, fontFamily: FONT_DISPLAY }]}>
            Follow requests
          </OxText>
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
      ) : null}

      <View style={styles.actions}>
        <OxButton
          title="Invite friends"
          variant="secondary"
          loading={inviting}
          onPress={() => void invite()}
          style={styles.grow}
        />
        <OxButton
          title="Share profile"
          variant="secondary"
          onPress={shareProfile}
          style={styles.grow}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 14, gap: 14 },
  counts: { fontSize: 15, textAlign: "center" },
  requests: { gap: 8 },
  title: { fontSize: 20, textTransform: "uppercase" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  person: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  name: { fontSize: 16, flexShrink: 1 },
  actions: { flexDirection: "row", gap: 12 },
  grow: { flex: 1 },
});
