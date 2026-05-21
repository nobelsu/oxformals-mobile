import { useAuth } from "@/src/components/auth/useAuth";
import { PushPermissionPromptModal } from "@/src/components/push/PushPermissionPromptModal";
import { usePushNotificationActions } from "@/src/components/push/PushNotificationProvider";
import { Chip } from "@/src/components/ui/Chip";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxModal } from "@/src/components/ui/OxModal";
import { OxSpinner } from "@/src/components/ui/OxSpinner";
import { OxText } from "@/src/components/ui/OxText";
import { space } from "@/src/constants/spacing";
import { isPushPermissionBlocked } from "@/src/lib/push/registerForPushNotifications";
import { UI_FONT_OPTIONS, type UiFontId } from "@/src/lib/uiFont";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Modal, StyleSheet, View } from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function SettingsModal({ visible, onClose }: Props) {
  const { user, updateProfile, signOut } = useAuth();
  const { syncPushRegistration, disablePushNotifications } =
    usePushNotificationActions();
  const { colors, uiFont } = useOxTheme();
  const router = useRouter();
  const [themeBusy, setThemeBusy] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  // Overlay only when disabling push — enabling may show the system or settings prompt.
  const settingsOverlayBusy =
    themeBusy || wishlistBusy || (pushBusy && pushEnabled);
  const [showPushPermissionPrompt, setShowPushPermissionPrompt] = useState(false);

  const pushEnabled = user?.pushChatAlerts !== false;

  const handleThemeChange = useCallback(
    async (id: UiFontId) => {
      if (themeBusy || id === uiFont) return;
      setThemeBusy(true);
      try {
        await updateProfile({ uiFont: id });
      } finally {
        setThemeBusy(false);
      }
    },
    [themeBusy, uiFont, updateProfile],
  );

  return (
    <>
      <OxModal visible={visible} onClose={onClose} title="Settings">
      <OxText style={{ color: colors.inkMuted, marginBottom: 4 }}>
        Appearance theme
      </OxText>
      <OxText style={{ color: colors.inkSoft, fontSize: 12, marginBottom: 12 }}>
        From warm paper to mint — same sketchbook, new colors.
      </OxText>
      <View style={styles.themeChips}>
        {UI_FONT_OPTIONS.map((opt) => (
          <Chip
            key={opt.id}
            label={opt.label}
            selected={uiFont === opt.id}
            onPress={
              themeBusy
                ? undefined
                : () => {
                    void handleThemeChange(opt.id);
                  }
            }
          />
        ))}
      </View>
      {user?.emailWishlistAlerts !== undefined && (
        <View style={{ marginTop: 20 }}>
          <Chip
            label={
              user.emailWishlistAlerts
                ? "Wishlist emails: on"
                : "Wishlist emails: off"
            }
            onPress={
              wishlistBusy
                ? undefined
                : () => {
                    void (async () => {
                      setWishlistBusy(true);
                      try {
                        await updateProfile({
                          emailWishlistAlerts: !user.emailWishlistAlerts,
                        });
                      } finally {
                        setWishlistBusy(false);
                      }
                    })();
                  }
            }
          />
        </View>
      )}
      {user && (
        <View style={{ marginTop: 20 }}>
          <Chip
            label={
              pushEnabled ? "Notifications: on" : "Notifications: off"
            }
            onPress={
              pushBusy
                ? undefined
                : () => {
                    void (async () => {
                      setPushBusy(true);
                      try {
                        if (pushEnabled) {
                          await disablePushNotifications();
                        } else {
                          if (await isPushPermissionBlocked()) {
                            setShowPushPermissionPrompt(true);
                            return;
                          }
                          const granted = await syncPushRegistration();
                          if (!granted && (await isPushPermissionBlocked())) {
                            setShowPushPermissionPrompt(true);
                          }
                        }
                      } finally {
                        setPushBusy(false);
                      }
                    })();
                  }
            }
          />
        </View>
      )}
      <OxButton
        title="Sign out"
        variant="ghost"
        onPress={async () => {
          await signOut();
          onClose();
          router.replace("/login");
        }}
        style={{ marginTop: space[6] }}
      />
      </OxModal>
      <PushPermissionPromptModal
        visible={showPushPermissionPrompt}
        onClose={() => setShowPushPermissionPrompt(false)}
      />
      <Modal
        visible={settingsOverlayBusy}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.fullscreenOverlay}>
          <OxSpinner size="lg" accessibilityLabel="Updating settings" />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  themeChips: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
});
