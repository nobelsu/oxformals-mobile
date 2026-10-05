import { useAuth } from "@/src/components/auth/useAuth";
import { PushPermissionPromptModal } from "@/src/components/push/PushPermissionPromptModal";
import { usePushNotificationActions } from "@/src/components/push/PushNotificationProvider";
import {
  NotificationPrefsSection,
  ToggleRow,
} from "@/src/components/settings/SettingsSections";
import { SettingsScreen } from "@/src/components/settings/SettingsUi";
import { OxLoadingView } from "@/src/components/ui/OxLoadingView";
import { errorMessage } from "@/src/lib/errorMessage";
import { isPushPermissionBlocked } from "@/src/lib/push/registerForPushNotifications";
import { useState } from "react";
import { Alert } from "react-native";

export default function NotificationSettingsScreen() {
  const { user } = useAuth();
  const { syncPushRegistration, disablePushNotifications } =
    usePushNotificationActions();
  const [busy, setBusy] = useState(false);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

  if (!user) {
    return (
      <SettingsScreen title="Notifications">
        <OxLoadingView />
      </SettingsScreen>
    );
  }

  const chatOn = user.pushChatAlerts !== false;

  async function setChat(enabled: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      if (!enabled) {
        await disablePushNotifications();
      } else if (await isPushPermissionBlocked()) {
        setShowPermissionPrompt(true);
      } else {
        const granted = await syncPushRegistration();
        if (!granted && (await isPushPermissionBlocked())) {
          setShowPermissionPrompt(true);
        }
      }
    } catch (error) {
      Alert.alert("Couldn't save that", errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsScreen title="Notifications">
      <ToggleRow
        label="Chat messages"
        value={chatOn}
        disabled={busy}
        onChange={(enabled) => void setChat(enabled)}
      />
      <NotificationPrefsSection />
      <PushPermissionPromptModal
        visible={showPermissionPrompt}
        onClose={() => setShowPermissionPrompt(false)}
      />
    </SettingsScreen>
  );
}
