import type { Id } from "@/convex/_generated/dataModel";
import type {
  ChatMention,
  ChatMessage,
  ChatSendArgs,
  ListingSummary,
  MessageReplySnapshot,
  OutboundMessageStatus,
} from "@/src/lib/chat/types";

export type OutboundEntry = {
  clientId: string;
  conversationId: Id<"conversations">;
  senderUserId: Id<"users">;
  body: string;
  createdAt: number;
  mentions?: ChatMention[];
  referencedListing?: ListingSummary;
  replyTo?: MessageReplySnapshot;
  status: OutboundMessageStatus;
  serverMessageId?: Id<"messages">;
};

export function createOutboundClientId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function pendingMessageId(clientId: string): `pending:${string}` {
  return `pending:${clientId}`;
}

export function outboundToChatMessage(entry: OutboundEntry): ChatMessage {
  return {
    id: pendingMessageId(entry.clientId),
    conversationId: entry.conversationId,
    senderUserId: entry.senderUserId,
    body: entry.body,
    createdAt: entry.createdAt,
    ...(entry.mentions && entry.mentions.length > 0
      ? { mentions: entry.mentions }
      : {}),
    ...(entry.referencedListing
      ? { referencedListing: entry.referencedListing }
      : {}),
    ...(entry.replyTo ? { replyTo: entry.replyTo } : {}),
    outboundStatus: entry.status,
  };
}

/** Newest-first, matching `listMessages` order. Prepends visible outbound rows. */
export function mergeOutboundWithServer(
  server: ChatMessage[],
  outbound: OutboundEntry[],
): ChatMessage[] {
  const serverIdSet = new Set(server.map((m) => m.id));
  const visible = outbound.filter(
    (entry) =>
      !entry.serverMessageId || !serverIdSet.has(entry.serverMessageId),
  );
  if (visible.length === 0) return server;
  const pending = visible.map(outboundToChatMessage);
  return [...pending, ...server];
}

export function outboundEntryToSendArgs(entry: OutboundEntry): ChatSendArgs {
  return {
    body: entry.body,
    ...(entry.mentions && entry.mentions.length > 0
      ? { mentions: entry.mentions }
      : {}),
    ...(entry.referencedListing
      ? {
          referencedListingId: entry.referencedListing.id,
          referencedListing: entry.referencedListing,
        }
      : {}),
    ...(entry.replyTo
      ? { replyToMessageId: entry.replyTo.id, replyTo: entry.replyTo }
      : {}),
  };
}

export function createOutboundEntry(
  args: ChatSendArgs & {
    clientId: string;
    conversationId: Id<"conversations">;
    senderUserId: Id<"users">;
  },
): OutboundEntry {
  return {
    clientId: args.clientId,
    conversationId: args.conversationId,
    senderUserId: args.senderUserId,
    body: args.body,
    createdAt: Date.now(),
    status: "sending",
    ...(args.mentions && args.mentions.length > 0
      ? { mentions: args.mentions }
      : {}),
    ...(args.referencedListing
      ? { referencedListing: args.referencedListing }
      : {}),
    ...(args.replyTo ? { replyTo: args.replyTo } : {}),
  };
}
