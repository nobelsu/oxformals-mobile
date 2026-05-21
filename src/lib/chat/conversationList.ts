import type { ConversationPreview } from "@/src/lib/chat/types";
import { isGroupConversation } from "@/src/lib/chat/types";

export function conversationDisplayTitle(
  conversation: ConversationPreview,
): string {
  if (isGroupConversation(conversation)) {
    return conversation.name ?? conversation.title;
  }
  return conversation.otherUserName;
}

export function conversationSearchHaystack(
  conversation: ConversationPreview,
): string[] {
  const parts: string[] = [conversationDisplayTitle(conversation)];

  if (isGroupConversation(conversation)) {
    if (conversation.name) {
      parts.push(conversation.title);
    }
    for (const member of conversation.memberPreview) {
      parts.push(member.name);
    }
  } else if (conversation.otherUserCollege) {
    parts.push(conversation.otherUserCollege);
  }

  if (conversation.lastMessageBody) {
    parts.push(conversation.lastMessageBody);
  }

  return parts.map((p) => p.toLowerCase());
}

export function filterConversationsByQuery(
  conversations: ConversationPreview[],
  query: string,
): ConversationPreview[] {
  const q = query.trim().toLowerCase();
  if (!q) return conversations;

  return conversations.filter((convo) =>
    conversationSearchHaystack(convo).some((hay) => hay.includes(q)),
  );
}
