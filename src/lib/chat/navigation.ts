import type { Id } from "@/convex/_generated/dataModel";

export function chatsTabHref(): "/(tabs)/chats" {
  return "/(tabs)/chats";
}

export function newChatHref(): "/chat/new" {
  return "/chat/new";
}

export function chatConversationHref(
  conversationId: Id<"conversations">,
): `/chat/${Id<"conversations">}` {
  return `/chat/${conversationId}`;
}

export function chatGroupMembersHref(
  conversationId: Id<"conversations">,
): `/chat/${Id<"conversations">}/members` {
  return `/chat/${conversationId}/members`;
}
