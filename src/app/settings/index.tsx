import { api } from "@/convex/_generated/api";
import { useAuth } from "@/src/components/auth/useAuth";
import {
  SettingsGroup,
  SettingsRow,
  SettingsScreen,
} from "@/src/components/settings/SettingsUi";
import { OxLoadingView } from "@/src/components/ui/OxLoadingView";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { errorMessage } from "@/src/lib/errorMessage";
import { UI_FONT_OPTIONS } from "@/src/lib/uiFont";
import { useQuery } from "convex/react";
import { type Href, useRouter } from "expo-router";
import { useState } from "react";
import { Alert } from "react-native";

const MODE_LABEL = { system: "System", light: "Light", dark: "Dark" } as const;

export default function SettingsMenuScreen() {
  const { user, signOut } = useAuth();
  const { uiFont, appearance } = useOxTheme();
  const router = useRouter();
  const privacy = useQuery(api.follows.getMyPrivacy, user ? {} : "skip");
  const hasPassword = useQuery(api.password.hasPassword, user ? {} : "skip");
  const [signingOut, setSigningOut] = useState(false);

  if (!user) {
    return (
      <SettingsScreen title="Settings">
        <OxLoadingView />
      </SettingsScreen>
    );
  }

  const open = (name: string) => () => router.push(`/settings/${name}` as Href);
  const themeLabel = UI_FONT_OPTIONS.find((o) => o.id === uiFont)?.label;

  async function onSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      if (router.canDismiss()) router.dismissAll();
      router.replace("/login");
    } catch (error) {
      setSigningOut(false);
      Alert.alert("Couldn't sign you out", errorMessage(error));
    }
  }

  return (
    <SettingsScreen title="Settings">
      <SettingsGroup seed={31}>
        <SettingsRow
          icon="person-circle-outline"
          label="Account"
          value={user.email}
          onPress={open("account")}
        />
        <SettingsRow
          icon="color-palette-outline"
          label="Appearance"
          value={[themeLabel, MODE_LABEL[appearance]].filter(Boolean).join(" · ")}
          onPress={open("appearance")}
        />
        <SettingsRow
          icon="notifications-outline"
          label="Notifications"
          value={user.pushChatAlerts !== false ? "Chat messages on" : "Chat messages off"}
          onPress={open("notifications")}
        />
        <SettingsRow
          icon="lock-closed-outline"
          label="Privacy"
          value={privacy ? (privacy.isPrivate ? "Private" : "Public") : undefined}
          onPress={open("privacy")}
        />
        <SettingsRow
          icon="key-outline"
          label="Security"
          value={
            hasPassword === undefined
              ? undefined
              : hasPassword
                ? "Password set"
                : "No password"
          }
          onPress={open("security")}
        />
      </SettingsGroup>
      <SettingsGroup seed={32}>
        <SettingsRow
          icon="log-out-outline"
          label="Sign out"
          chevron={false}
          loading={signingOut}
          onPress={() => void onSignOut()}
        />
      </SettingsGroup>
    </SettingsScreen>
  );
}
