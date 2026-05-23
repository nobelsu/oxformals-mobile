import { ensureChatNotificationCategory } from "@/src/lib/push/chatNotificationCategory";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export type PushRegistrationResult =
  | { status: "granted"; token: string; platform: "ios" | "android" }
  | { status: "denied" }
  | { status: "unavailable" };

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("chat", {
    name: "Chat messages",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
  });
}

function resolveProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId
  );
}

export async function registerForPushNotificationsAsync(): Promise<PushRegistrationResult> {
  if (Platform.OS === "web" || !Device.isDevice) {
    return { status: "unavailable" };
  }

  const projectId = resolveProjectId();
  if (!projectId) {
    if (__DEV__) {
      console.warn(
        "Push notifications: set expo.extra.eas.projectId in app.json (run eas init)",
      );
    }
    return { status: "unavailable" };
  }

  await ensureAndroidChannel();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return { status: "denied" };
  }

  await ensureChatNotificationCategory();

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const platform = Platform.OS === "ios" ? "ios" : "android";
    return {
      status: "granted",
      token: tokenResponse.data,
      platform,
    };
  } catch (error) {
    if (__DEV__) {
      console.warn(
        "Push notifications: could not get Expo push token. On iOS, rebuild the native app after enabling Push Notifications for your bundle ID (npx expo prebuild --platform ios && npx expo run:ios).",
        error,
      );
    }
    return { status: "unavailable" };
  }
}

export async function getCurrentPushPermissionStatus(): Promise<
  "granted" | "denied" | "undetermined"
> {
  if (Platform.OS === "web" || !Device.isDevice) {
    return "denied";
  }
  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") return "granted";
  if (status === "denied") return "denied";
  return "undetermined";
}

export async function isPushPermissionBlocked(): Promise<boolean> {
  return (await getCurrentPushPermissionStatus()) === "denied";
}
