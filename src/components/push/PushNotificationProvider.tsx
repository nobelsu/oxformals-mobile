import "@/src/lib/push/notificationHandler";
import { useAuth } from "@/src/components/auth/useAuth";
import { ActiveChatProvider } from "@/src/contexts/ActiveChatContext";
import { useNotificationObserver } from "@/src/hooks/useNotificationObserver";
import { usePushNotifications } from "@/src/hooks/usePushNotifications";
import { createContext, useContext, useMemo, type ReactNode } from "react";

type PushContextValue = {
  syncPushRegistration: () => Promise<boolean>;
  disablePushNotifications: () => Promise<void>;
};

const PushContext = createContext<PushContextValue | null>(null);

export function usePushNotificationActions(): PushContextValue {
  const ctx = useContext(PushContext);
  if (!ctx) {
    return {
      syncPushRegistration: async () => false,
      disablePushNotifications: async () => {},
    };
  }
  return ctx;
}

export function PushNotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { syncPushRegistration, disablePushNotifications } =
    usePushNotifications(isAuthenticated);
  useNotificationObserver();

  const value = useMemo(
    () => ({ syncPushRegistration, disablePushNotifications }),
    [syncPushRegistration, disablePushNotifications],
  );

  return (
    <PushContext.Provider value={value}>
      <ActiveChatProvider>{children}</ActiveChatProvider>
    </PushContext.Provider>
  );
}
