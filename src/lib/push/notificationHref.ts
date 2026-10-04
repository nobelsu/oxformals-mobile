/**
 * Notifications carry the website's paths. This turns one into the matching
 * screen in the app, or null when it isn't a path at all.
 */
export function notificationHref(url: unknown): string | null {
  if (typeof url !== "string" || !url.startsWith("/")) return null;
  const [path, query = ""] = url.split("?");
  const params = new URLSearchParams(query);

  // "/requests/<listingId>" and "/?listing=<id>" both mean "open this formal".
  const requests = path.match(/^\/requests\/([^/]+)$/);
  if (requests) return `/listing/${requests[1]}`;
  const listing = params.get("listing");
  if (listing) return `/listing/${listing}`;

  if (/^\/(listing|profile|chat)\/[^/]+$/.test(path)) return path;

  if (path === "/") {
    const tab = params.get("tab");
    if (tab === "browse") return "/(tabs)/browse";
    if (tab === "mine") return "/(tabs)/mine";
    if (tab === "chats") return "/(tabs)/chats";
    return "/(tabs)/feed";
  }
  return "/(tabs)/feed";
}
