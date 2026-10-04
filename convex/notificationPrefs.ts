import { v, type Infer } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { NotificationCategory } from "./notificationKinds";

const channelPrefsValidator = v.object({
  bookings: v.boolean(),
  invites: v.boolean(),
  social: v.boolean(),
  credits: v.boolean(),
});

export const notificationPrefsValidator = v.object({
  push: channelPrefsValidator,
  email: channelPrefsValidator,
});
export type NotificationPrefs = Infer<typeof notificationPrefsValidator>;
export type NotificationChannel = keyof NotificationPrefs;

type PrefsUser = Partial<
  Pick<Doc<"users">, "notificationPrefs" | "emailNotifications">
>;

/**
 * Saved prefs, or the defaults: push on for everything; email on for all but
 * social (so "Want to go" alerts and review reminders keep coming). Someone
 * who had switched email off (legacy `emailNotifications: false`) starts with
 * every email off.
 */
export function resolvePrefs(user: PrefsUser): NotificationPrefs {
  if (user.notificationPrefs) return user.notificationPrefs;
  const emailOn = user.emailNotifications !== false;
  return {
    push: { bookings: true, invites: true, social: true, credits: true },
    email: { bookings: emailOn, invites: emailOn, social: false, credits: emailOn },
  };
}

export function pushAllowed(user: PrefsUser, category: NotificationCategory): boolean {
  return resolvePrefs(user).push[category];
}

export function emailAllowed(user: PrefsUser, category: NotificationCategory): boolean {
  return resolvePrefs(user).email[category];
}
