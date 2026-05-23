import { useAuth } from "@/src/components/auth/useAuth";
import { api } from "@/convex/_generated/api";
import {
  getCurrentPushPermissionStatus,
  registerForPushNotificationsAsync,
} from "@/src/lib/push/registerForPushNotifications";
import { useMutation } from "convex/react";
import { useCallback, useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

const FOREGROUND_SYNC_DEBOUNCE_MS = 3_000;

async function persistPushToken(
  registerTokenMut: (args: {
    token: string;
    platform: "ios" | "android";
  }) => Promise<boolean>,
  setPushChatAlertsMut: (args: { enabled: boolean }) => Promise<null>,
  token: string,
  platform: "ios" | "android",
): Promise<boolean> {
  const registered = await registerTokenMut({ token, platform });
  if (!registered) return false;
  await setPushChatAlertsMut({ enabled: true });
  return true;
}

export function usePushNotifications(enabled: boolean): {
  syncPushRegistration: () => Promise<boolean>;
  disablePushNotifications: () => Promise<void>;
} {
  const registerTokenMut = useMutation(api.pushNotifications.registerPushToken);
  const removeTokenMut = useMutation(api.pushNotifications.removePushToken);
  const setPushChatAlertsMut = useMutation(
    api.pushNotifications.setPushChatAlerts,
  );
  const tokenRef = useRef<string | null>(null);
  const syncedTokenRef = useRef<string | null>(null);
  const foregroundSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const syncingRef = useRef(false);

  const syncPushRegistration = useCallback(async (): Promise<boolean> => {
    if (!enabled) return false;

    if (syncingRef.current) return syncedTokenRef.current != null;

    const result = await registerForPushNotificationsAsync();
    if (result.status === "granted") {
      if (
        syncedTokenRef.current === result.token &&
        tokenRef.current === result.token
      ) {
        return true;
      }

      syncingRef.current = true;
      try {
        const ok = await persistPushToken(
          registerTokenMut,
          setPushChatAlertsMut,
          result.token,
          result.platform,
        );
        if (ok) {
          tokenRef.current = result.token;
          syncedTokenRef.current = result.token;
          return true;
        }
        tokenRef.current = null;
        syncedTokenRef.current = null;
        return false;
      } finally {
        syncingRef.current = false;
      }
    }

    if (result.status === "denied") {
      if (tokenRef.current) {
        await removeTokenMut({ token: tokenRef.current });
        tokenRef.current = null;
        syncedTokenRef.current = null;
      }
      await setPushChatAlertsMut({ enabled: false });
    }

    return false;
  }, [enabled, registerTokenMut, removeTokenMut, setPushChatAlertsMut]);

  const syncFromPermissionOnly = useCallback(async () => {
    if (!enabled) return;

    const permission = await getCurrentPushPermissionStatus();
    if (permission === "granted") {
      if (syncedTokenRef.current && tokenRef.current === syncedTokenRef.current) {
        return;
      }

      const result = await registerForPushNotificationsAsync();
      if (result.status === "granted") {
        if (syncedTokenRef.current === result.token) return;

        syncingRef.current = true;
        try {
          const ok = await persistPushToken(
            registerTokenMut,
            setPushChatAlertsMut,
            result.token,
            result.platform,
          );
          if (ok) {
            tokenRef.current = result.token;
            syncedTokenRef.current = result.token;
          } else {
            tokenRef.current = null;
            syncedTokenRef.current = null;
          }
        } finally {
          syncingRef.current = false;
        }
      }
      return;
    }

    if (permission === "denied") {
      if (tokenRef.current) {
        await removeTokenMut({ token: tokenRef.current });
        tokenRef.current = null;
        syncedTokenRef.current = null;
      }
      await setPushChatAlertsMut({ enabled: false });
    }
  }, [enabled, registerTokenMut, removeTokenMut, setPushChatAlertsMut]);

  useEffect(() => {
    if (!enabled) return;

    void syncPushRegistration();

    const onAppStateChange = (next: AppStateStatus) => {
      if (next !== "active") return;

      if (foregroundSyncTimerRef.current) {
        clearTimeout(foregroundSyncTimerRef.current);
      }
      foregroundSyncTimerRef.current = setTimeout(() => {
        foregroundSyncTimerRef.current = null;
        void syncFromPermissionOnly();
      }, FOREGROUND_SYNC_DEBOUNCE_MS);
    };

    const sub = AppState.addEventListener("change", onAppStateChange);
    return () => {
      sub.remove();
      if (foregroundSyncTimerRef.current) {
        clearTimeout(foregroundSyncTimerRef.current);
        foregroundSyncTimerRef.current = null;
      }
    };
  }, [enabled, syncPushRegistration, syncFromPermissionOnly]);

  useEffect(() => {
    if (!enabled && tokenRef.current) {
      void removeTokenMut({ token: tokenRef.current });
      tokenRef.current = null;
      syncedTokenRef.current = null;
    }
  }, [enabled, removeTokenMut]);

  const disablePushNotifications = useCallback(async () => {
    if (tokenRef.current) {
      await removeTokenMut({ token: tokenRef.current });
      tokenRef.current = null;
      syncedTokenRef.current = null;
    }
    await setPushChatAlertsMut({ enabled: false });
  }, [removeTokenMut, setPushChatAlertsMut]);

  return {
    syncPushRegistration,
    disablePushNotifications,
  };
}
