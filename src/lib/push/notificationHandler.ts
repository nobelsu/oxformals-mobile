import { getActiveConversationId } from "@/src/lib/push/activeChatState";
import * as Notifications from "expo-notifications";

function pushConversationId(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const id = (data as { conversationId?: unknown }).conversationId;
  return typeof id === "string" && id.length > 0 ? id : null;
}

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const conversationId = pushConversationId(
      notification.request.content.data,
    );
    const activeId = getActiveConversationId();
    const suppress =
      conversationId !== null &&
      activeId !== null &&
      conversationId === activeId;

    return {
      shouldShowAlert: !suppress,
      shouldShowBanner: !suppress,
      shouldShowList: !suppress,
      shouldPlaySound: !suppress,
      shouldSetBadge: false,
    };
  },
});
