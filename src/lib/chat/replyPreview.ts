import type { Id } from "@/convex/_generated/dataModel";
import {
  formatListingDate,
  formatListingStatusLabel,
} from "@/src/lib/data/format";
import type {
  ChatMessage,
  ListingSummary,
  MessageReplySnapshot,
} from "@/src/lib/chat/types";
import { isPendingMessageId } from "@/src/lib/chat/types";

export const UNAVAILABLE_LABEL = "Original message unavailable";

export function formatReplyListingPreview(listing: ListingSummary): string {
  return [
    listing.ownerName,
    listing.college,
    formatListingDate(listing.dateTime),
    formatListingStatusLabel(listing.status, listing.seatsAvailable),
  ].join(" · ");
}

export function truncateReplyBody(body: string, maxLen = 120): string {
  if (body.length <= maxLen) return body;
  return `${body.slice(0, maxLen)}…`;
}

export function replySnapshotSenderLabel(
  reply: MessageReplySnapshot,
  currentUserId?: Id<"users">,
): string {
  if (currentUserId && reply.senderUserId === currentUserId) return "You";
  if (reply.senderName) return reply.senderName;
  return "User";
}

export function replyTargetSenderLabel(
  message: ChatMessage,
  currentUserId?: Id<"users">,
): string {
  if (currentUserId && message.senderUserId === currentUserId) return "You";
  if (message.senderName) return message.senderName;
  return "User";
}

export function buildReplySnapshotFromMessage(
  message: ChatMessage,
): MessageReplySnapshot {
  if (isPendingMessageId(message.id)) {
    throw new Error("Cannot build reply snapshot from a pending message");
  }
  return {
    id: message.id,
    senderUserId: message.senderUserId,
    senderName: message.senderName,
    body: message.body,
    ...(message.referencedListing
      ? { referencedListing: message.referencedListing }
      : {}),
  };
}
