import * as Notifications from "expo-notifications";
import { type Href, router } from "expo-router";
import { useEffect } from "react";

function redirectFromNotification(
  notification: Notifications.Notification,
): void {
  const url = notification.request.content.data?.url;
  if (typeof url === "string" && url.startsWith("/")) {
    router.push(url as Href);
  }
}

export function useNotificationObserver(): void {
  useEffect(() => {
    const last = Notifications.getLastNotificationResponse();
    if (last?.notification) {
      redirectFromNotification(last.notification);
    }

    const subscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        redirectFromNotification(response.notification);
      });

    return () => subscription.remove();
  }, []);
}
