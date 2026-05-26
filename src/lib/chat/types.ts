import type { Id } from "@/convex/_generated/dataModel";
import type { AvatarSource } from "@/src/lib/auth/types";
import type { ListingType } from "@/src/lib/data/types";

export type ListingSummary = {
  id: Id<"listings">;
  ownerUserId: Id<"users">;
  ownerName: string;
  college: string;
  dateTime: string;
  status: "active" | "confirmed" | "closed" | "expired";
  seatsAvailable: number;
  listingType?: ListingType;
  price?: number;
};

export type ChatMention = {
  userId: Id<"users">;
  label: string;
  start: number;
};

export type MessageReplySnapshot = {
  id: Id<"messages">;
  senderUserId: Id<"users">;
  senderName?: string;
  body: string;
  referencedListing?: ListingSummary;
  unavailable?: boolean;
};

export type OutboundMessageStatus = "sending" | "failed";

export type PendingMessageId = `pending:${string}`;

export type ChatMessageId = Id<"messages"> | PendingMessageId;

export function isPendingMessageId(id: ChatMessageId): id is PendingMessageId {
  return typeof id === "string" && id.startsWith("pending:");
}

export type ChatMessage = {
  id: ChatMessageId;
  conversationId: Id<"conversations">;
  senderUserId: Id<"users">;
  senderName?: string;
  body: string;
  createdAt: number;
  referencedListing?: ListingSummary;
  mentions?: ChatMention[];
  replyTo?: MessageReplySnapshot;
  /** Client-only delivery state for outbound messages not yet in the server list. */
  outboundStatus?: OutboundMessageStatus;
};

export type ChatSendArgs = {
  body: string;
  mentions?: ChatMention[];
  referencedListingId?: Id<"listings">;
  referencedListing?: ListingSummary;
  replyToMessageId?: Id<"messages">;
  /** Optimistic reply quote; captured before composer clears reply target. */
  replyTo?: MessageReplySnapshot;
};

export type GroupMemberPreview = {
  id: Id<"users">;
  name: string;
  avatar?: AvatarSource;
};

export type DmConversationPreview = {
  kind: "dm";
  id: Id<"conversations">;
  otherUserId: Id<"users">;
  otherUserName: string;
  otherUserAvatar?: AvatarSource;
  otherUserCollege?: string;
  lastMessageAt: number;
  lastMessageBody?: string;
  lastMessageSenderId?: Id<"users">;
  unreadCount: number;
};

export type GroupConversationPreview = {
  kind: "group";
  id: Id<"conversations">;
  title: string;
  /** Custom name when set; title falls back to member names when unset. */
  name?: string;
  memberCount: number;
  memberPreview: GroupMemberPreview[];
  createdByUserId: Id<"users">;
  isCreator: boolean;
  lastMessageAt: number;
  lastMessageBody?: string;
  lastMessageSenderId?: Id<"users">;
  unreadCount: number;
};

export type ConversationPreview =
  | DmConversationPreview
  | GroupConversationPreview;

export function isGroupConversation(
  convo: ConversationPreview,
): convo is GroupConversationPreview {
  return convo.kind === "group";
}

export function isDmConversation(
  convo: ConversationPreview,
): convo is DmConversationPreview {
  return convo.kind === "dm";
}
