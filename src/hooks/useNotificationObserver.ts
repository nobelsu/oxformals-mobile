import { useAuth } from "@/src/components/auth/useAuth";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  CHAT_PUSH_REPLY_ACTION_ID,
} from "@/src/lib/push/chatNotificationCategory";
import { useMutation } from "convex/react";
import * as Notifications from "expo-notifications";
import { type Href, router } from "expo-router";
import { useCallback, useEffect, useRef } from "react";

function redirectFromNotification(
  notification: Notifications.Notification,
): void {
  const url = notification.request.content.data?.url;
  if (typeof url === "string" && url.startsWith("/")) {
    router.push(url as Href);
  }
}

function getConversationIdFromNotification(
  notification: Notifications.Notification,
): Id<"conversations"> | null {
  const conversationId = notification.request.content.data?.conversationId;
  if (typeof conversationId !== "string" || conversationId.length === 0) {
    return null;
  }
  return conversationId as Id<"conversations">;
}

export function useNotificationObserver(): void {
  const { isAuthenticated } = useAuth();
  const sendMessage = useMutation(api.chat.sendMessage);
  const isAuthenticatedRef = useRef(isAuthenticated);
  isAuthenticatedRef.current = isAuthenticated;

  const sendMessageRef = useRef(sendMessage);
  sendMessageRef.current = sendMessage;

  const handleNotificationResponse = useCallback(
    async (response: Notifications.NotificationResponse) => {
      const { actionIdentifier, notification, userText } = response;

      if (actionIdentifier === CHAT_PUSH_REPLY_ACTION_ID) {
        if (!isAuthenticatedRef.current) return;

        const body = userText?.trim();
        if (!body) return;

        const conversationId = getConversationIdFromNotification(notification);
        if (!conversationId) return;

        try {
          await sendMessageRef.current({ conversationId, body });
        } catch (error) {
          if (__DEV__) {
            console.warn("Push notification reply failed:", error);
          }
        }
        return;
      }

      if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        redirectFromNotification(notification);
      }
    },
    [],
  );

  useEffect(() => {
    const last = Notifications.getLastNotificationResponse();
    if (last) {
      void handleNotificationResponse(last);
    }

    const subscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        void handleNotificationResponse(response);
      });

    return () => subscription.remove();
  }, [handleNotificationResponse]);
}
