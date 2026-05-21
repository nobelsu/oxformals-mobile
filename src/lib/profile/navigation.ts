import type { Router } from "expo-router";

export function profileTabHref(): "/(tabs)/mine" {
  return "/(tabs)/mine";
}

export function publicProfileHref(userId: string): `/profile/${string}` {
  return `/profile/${userId}`;
}

/** Opens own profile on the tab (no stack back); others on the public profile stack screen. */
export function openProfile(
  router: Pick<Router, "dismissTo" | "push">,
  userId: string,
  currentUserId?: string,
): void {
  if (currentUserId && userId === currentUserId) {
    router.dismissTo(profileTabHref());
  } else {
    router.push(publicProfileHref(userId));
  }
}
