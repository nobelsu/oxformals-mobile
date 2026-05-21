import { getActiveConversationId } from "@/src/lib/push/activeChatState";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;
    const conversationId =
      typeof data?.conversationId === "string" ? data.conversationId : null;
    const activeId = getActiveConversationId();
    const suppress =
      conversationId !== null &&
      activeId !== null &&
      conversationId === activeId;

    return {
      shouldShowBanner: !suppress,
      shouldShowList: !suppress,
      shouldPlaySound: !suppress,
      shouldSetBadge: false,
    };
  },
});
