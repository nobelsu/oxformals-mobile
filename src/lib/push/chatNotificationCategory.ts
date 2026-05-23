import * as Notifications from "expo-notifications";

/** Must match `categoryId` sent from convex/pushNotifications.ts */
export const CHAT_PUSH_CATEGORY_ID = "chat_reply";

export const CHAT_PUSH_REPLY_ACTION_ID = "reply";

export async function ensureChatNotificationCategory(): Promise<void> {
  await Notifications.setNotificationCategoryAsync(CHAT_PUSH_CATEGORY_ID, [
    {
      identifier: CHAT_PUSH_REPLY_ACTION_ID,
      buttonTitle: "Reply",
      textInput: {
        placeholder: "Message…",
        submitButtonTitle: "Send",
      },
      options: {
        opensAppToForeground: false,
      },
    },
  ]);
}
