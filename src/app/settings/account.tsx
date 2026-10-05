import { api } from "@/convex/_generated/api";
import { useAuth } from "@/src/components/auth/useAuth";
import { CreditsCard } from "@/src/components/profile/CreditsCard";
import { DeleteAccountSheet } from "@/src/components/settings/DeleteAccountSheet";
import {
  SettingsGroup,
  SettingsRow,
  SettingsScreen,
} from "@/src/components/settings/SettingsUi";
import { OxLoadingView } from "@/src/components/ui/OxLoadingView";
import { OxText } from "@/src/components/ui/OxText";
import { SketchCard } from "@/src/components/ui/SketchCard";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { errorMessage } from "@/src/lib/errorMessage";
import { WEB_ORIGIN } from "@/src/lib/webOrigin";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Alert, Linking, Share, StyleSheet } from "react-native";

export default function AccountSettingsScreen() {
  const { user } = useAuth();
  const { colors } = useOxTheme();
  const summary = useQuery(api.account.getMyAccountSummary, user ? {} : "skip");
  const getInviteCode = useMutation(api.invites.getOrCreateMyInviteCode);
  const [inviting, setInviting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!user) {
    return (
      <SettingsScreen title="Account">
        <OxLoadingView />
      </SettingsScreen>
    );
  }

  async function invite() {
    if (inviting) return;
    setInviting(true);
    try {
      const code = await getInviteCode({});
      await Share.share({ message: `Join me on Oxformals!\n${WEB_ORIGIN}/i/${code}` });
    } catch (error) {
      Alert.alert("Couldn't make your invite link", errorMessage(error));
    } finally {
      setInviting(false);
    }
  }

  const facts = summary
    ? [
        `Member since ${new Date(summary.memberSince).toLocaleDateString("en-GB", {
          month: "long",
          year: "numeric",
        })}`,
        `${summary.friendsJoined} friend${summary.friendsJoined === 1 ? "" : "s"} joined`,
      ].join(" · ")
    : null;

  return (
    <SettingsScreen title="Account">
      <SketchCard seed={41} padding={14} tilt={0.001}>
        <OxText style={[styles.note, { color: colors.inkMuted }]}>Signed in as</OxText>
        <OxText style={[styles.email, { color: colors.ink }]}>{user.email}</OxText>
        {facts ? (
          <OxText style={[styles.note, { color: colors.inkMuted }]}>{facts}</OxText>
        ) : null}
      </SketchCard>
      <CreditsCard />
      <SettingsGroup seed={42}>
        <SettingsRow
          icon="person-add-outline"
          label="Invite friends"
          chevron={false}
          loading={inviting}
          onPress={() => void invite()}
        />
        <SettingsRow
          icon="download-outline"
          label="Download my data"
          onPress={() => {
            Linking.openURL(`${WEB_ORIGIN}/settings`).catch((error) =>
              Alert.alert("Couldn't open the website", errorMessage(error)),
            );
          }}
        />
        <SettingsRow
          icon="trash-outline"
          label="Delete account"
          danger
          chevron={false}
          onPress={() => setDeleting(true)}
        />
      </SettingsGroup>
      <DeleteAccountSheet visible={deleting} onClose={() => setDeleting(false)} />
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: 13, lineHeight: 18 },
  email: { fontSize: 18, marginBottom: 4 },
});
