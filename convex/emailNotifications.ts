import type { Doc } from "./_generated/dataModel";

/**
 * "Want to go" alerts and review reminders: once the user has saved
 * per-category prefs they follow "Credits & reminders" email; before that,
 * the legacy on/off switch (default on).
 */
export function emailNotificationsEnabled(
  user: Partial<
    Pick<Doc<"users">, "emailNotifications" | "emailWishlistAlerts" | "notificationPrefs">
  >,
): boolean {
  if (user.notificationPrefs) return user.notificationPrefs.email.credits;
  if (user.emailNotifications !== undefined) {
    return user.emailNotifications !== false;
  }
  return user.emailWishlistAlerts !== false;
}
