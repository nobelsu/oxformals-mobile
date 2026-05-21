import { useAuth } from "@/src/components/auth/useAuth";
import { api } from "@/convex/_generated/api";
import {
  getCurrentPushPermissionStatus,
  registerForPushNotificationsAsync,
} from "@/src/lib/push/registerForPushNotifications";
import { useMutation } from "convex/react";
import { useCallback, useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

export function usePushNotifications(enabled: boolean): {
  syncPushRegistration: () => Promise<boolean>;
  disablePushNotifications: () => Promise<void>;
} {
  const { isAuthenticated } = useAuth();
  const registerTokenMut = useMutation(api.pushNotifications.registerPushToken);
  const removeTokenMut = useMutation(api.pushNotifications.removePushToken);
  const setPushChatAlertsMut = useMutation(
    api.pushNotifications.setPushChatAlerts,
  );
  const tokenRef = useRef<string | null>(null);

  const syncPushRegistration = useCallback(async (): Promise<boolean> => {
    const result = await registerForPushNotificationsAsync();
    if (result.status === "granted") {
      tokenRef.current = result.token;
      await registerTokenMut({
        token: result.token,
        platform: result.platform,
      });
      await setPushChatAlertsMut({ enabled: true });
      return true;
    }

    if (result.status === "denied") {
      if (tokenRef.current) {
        await removeTokenMut({ token: tokenRef.current });
        tokenRef.current = null;
      }
      await setPushChatAlertsMut({ enabled: false });
    }

    return false;
  }, [registerTokenMut, removeTokenMut, setPushChatAlertsMut]);

  const syncFromPermissionOnly = useCallback(async () => {
    const permission = await getCurrentPushPermissionStatus();
    if (permission === "granted") {
      const result = await registerForPushNotificationsAsync();
      if (result.status === "granted") {
        tokenRef.current = result.token;
        await registerTokenMut({
          token: result.token,
          platform: result.platform,
        });
        await setPushChatAlertsMut({ enabled: true });
      }
      return;
    }

    if (permission === "denied") {
      if (tokenRef.current) {
        await removeTokenMut({ token: tokenRef.current });
        tokenRef.current = null;
      }
      await setPushChatAlertsMut({ enabled: false });
    }
  }, [registerTokenMut, removeTokenMut, setPushChatAlertsMut]);

  useEffect(() => {
    if (!isAuthenticated || !enabled) return;

    void syncPushRegistration();

    const onAppStateChange = (next: AppStateStatus) => {
      if (next === "active") {
        void syncFromPermissionOnly();
      }
    };

    const sub = AppState.addEventListener("change", onAppStateChange);
    return () => sub.remove();
  }, [isAuthenticated, enabled, syncPushRegistration, syncFromPermissionOnly]);

  useEffect(() => {
    if (!isAuthenticated && tokenRef.current) {
      void removeTokenMut({ token: tokenRef.current });
      tokenRef.current = null;
    }
  }, [isAuthenticated, removeTokenMut]);

  const disablePushNotifications = useCallback(async () => {
    if (tokenRef.current) {
      await removeTokenMut({ token: tokenRef.current });
      tokenRef.current = null;
    }
    await setPushChatAlertsMut({ enabled: false });
  }, [removeTokenMut, setPushChatAlertsMut]);

  return {
    syncPushRegistration,
    disablePushNotifications,
  };
}
