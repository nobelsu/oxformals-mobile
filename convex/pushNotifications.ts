import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
} from "./_generated/server";
import type { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";
import {
  formatListingDate,
  formatListingTypeLabel,
} from "./listingFormat";
import { requireActiveUser } from "./guards";

const PUSH_PREVIEW_MAX_LENGTH = 120;
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/** Must match src/lib/push/chatNotificationCategory.ts */
const CHAT_PUSH_CATEGORY_ID = "chat_reply";
const CHAT_PUSH_CHANNEL_ID = "chat";

const pushPlatformValidator = v.union(
  v.literal("ios"),
  v.literal("android"),
);

const chatPushDataValidator = v.object({
  url: v.string(),
  conversationId: v.string(),
});

const wishlistPushDataValidator = v.object({
  url: v.string(),
  listingId: v.string(),
});

const pushMessageValidator = v.object({
  to: v.string(),
  title: v.string(),
  body: v.string(),
  data: v.union(chatPushDataValidator, wishlistPushDataValidator),
  categoryId: v.optional(v.string()),
  channelId: v.optional(v.string()),
  collapseId: v.optional(v.string()),
});

const pushPayloadValidator = v.union(
  v.null(),
  v.object({
    messages: v.array(pushMessageValidator),
  }),
);

type PushMessage = {
  to: string;
  title: string;
  body: string;
  data:
    | { url: string; conversationId: string }
    | { url: string; listingId: string };
  categoryId?: string;
  channelId?: string;
  collapseId?: string;
};

type ExpoPushTicket =
  | { status: "ok"; id?: string }
  | { status: "error"; message?: string; details?: { error?: string } };

function conversationKind(convo: Doc<"conversations">): "dm" | "group" {
  if (convo.kind === "group") return "group";
  return "dm";
}

function otherParticipantId(
  convo: Doc<"conversations">,
  viewerId: Id<"users">,
): Id<"users"> {
  if (!convo.participantLow || !convo.participantHigh) {
    throw new Error("Invalid DM conversation");
  }
  return convo.participantLow === viewerId
    ? convo.participantHigh
    : convo.participantLow;
}

async function getGroupMemberUserIds(
  ctx: QueryCtx,
  conversationId: Id<"conversations">,
): Promise<Id<"users">[]> {
  const rows = await ctx.db
    .query("conversationMembers")
    .withIndex("by_conversationId", (q) =>
      q.eq("conversationId", conversationId),
    )
    .collect();
  return rows.map((r) => r.userId);
}

async function resolveGroupTitle(
  ctx: QueryCtx,
  convo: Doc<"conversations">,
  excludeUserId: Id<"users">,
): Promise<string> {
  const customName = convo.name?.trim();
  if (customName) return customName;

  const memberIds = await getGroupMemberUserIds(ctx, convo._id);
  const names: string[] = [];
  for (const memberId of memberIds) {
    if (memberId === excludeUserId) continue;
    const u = await ctx.db.get(memberId);
    names.push(u?.name?.trim() || "User");
  }
  return names.join(", ") || "Group chat";
}

function truncatePreview(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "New message";
  if (trimmed.length <= PUSH_PREVIEW_MAX_LENGTH) return trimmed;
  return `${trimmed.slice(0, PUSH_PREVIEW_MAX_LENGTH - 1)}…`;
}

async function getTokensForUser(
  ctx: QueryCtx,
  userId: Id<"users">,
): Promise<string[]> {
  const rows = await ctx.db
    .query("pushTokens")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();
  return rows.map((r) => r.token);
}

async function shouldNotifyUser(
  ctx: QueryCtx,
  userId: Id<"users">,
): Promise<boolean> {
  const user = await ctx.db.get(userId);
  if (!user) return false;
  return user.pushChatAlerts !== false;
}

/** Resolves token rows safely; dedupes if index invariant was violated. */
async function getPushTokenRowsByToken(
  ctx: QueryCtx,
  token: string,
): Promise<Doc<"pushTokens">[]> {
  return await ctx.db
    .query("pushTokens")
    .withIndex("by_token", (q) => q.eq("token", token))
    .collect();
}

/** Keeps one row per token string; removes accidental duplicates. */
async function dedupePushTokenRows(
  ctx: MutationCtx,
  rows: Doc<"pushTokens">[],
): Promise<Doc<"pushTokens"> | null> {
  if (rows.length === 0) return null;
  const [primary, ...duplicates] = rows;
  for (const dup of duplicates) {
    await ctx.db.delete(dup._id);
  }
  return primary;
}

async function deliverExpoPushMessages(
  ctx: ActionCtx,
  messages: PushMessage[],
): Promise<void> {
  if (messages.length === 0) return;

  const response = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    console.error(
      "deliverExpoPushMessages: Expo API error",
      response.status,
      await response.text(),
    );
    return;
  }

  const result = (await response.json()) as { data?: ExpoPushTicket[] };
  const tickets = result.data ?? [];
  const invalidTokens: string[] = [];

  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    if (ticket.status === "error") {
      const err = ticket.details?.error;
      if (err === "DeviceNotRegistered") {
        const msg = messages[i];
        if (msg) invalidTokens.push(msg.to);
      } else {
        console.error("deliverExpoPushMessages: ticket error", ticket);
      }
    }
  }

  if (invalidTokens.length > 0) {
    await ctx.runMutation(internal.pushNotifications.pruneInvalidPushTokens, {
      tokens: invalidTokens,
    });
  }
}

export const registerPushToken = mutation({
  args: {
    token: v.string(),
    platform: pushPlatformValidator,
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const { userId } = await requireActiveUser(ctx);

    const rows = await getPushTokenRowsByToken(ctx, args.token);
    const existing = await dedupePushTokenRows(ctx, rows);

    const now = Date.now();
    if (existing) {
      if (existing.userId === userId && existing.platform === args.platform) {
        return true;
      }
      if (existing.userId !== userId) {
        throw new Error(
          "That push token is already linked to another account. Remove it there first.",
        );
      }
      await ctx.db.patch(existing._id, { platform: args.platform, updatedAt: now });
    } else {
      await ctx.db.insert("pushTokens", {
        userId,
        token: args.token,
        platform: args.platform,
        updatedAt: now,
      });
    }

    return true;
  },
});

export const removePushToken = mutation({
  args: { token: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const { userId } = await requireActiveUser(ctx);

    const rows = await getPushTokenRowsByToken(ctx, args.token);
    const existing = await dedupePushTokenRows(ctx, rows);

    if (existing && existing.userId === userId) {
      await ctx.db.delete(existing._id);
    }

    return true;
  },
});

export const setPushChatAlerts = mutation({
  args: { enabled: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId } = await requireActiveUser(ctx);

    await ctx.db.patch(userId, { pushChatAlerts: args.enabled });
    return null;
  },
});

export const getChatPushPayload = internalQuery({
  args: { messageId: v.id("messages") },
  returns: pushPayloadValidator,
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return null;

    const convo = await ctx.db.get(message.conversationId);
    if (!convo) return null;

    const sender = await ctx.db.get(message.senderUserId);
    const senderName = sender?.name?.trim() || "User";
    const preview = truncatePreview(message.body);
    const conversationId = message.conversationId;
    const data = {
      url: `/chat/${conversationId}`,
      conversationId,
    };

    let recipientIds: Id<"users">[] = [];
    let dmTitle: string | undefined;
    let groupTitle: string | undefined;

    if (conversationKind(convo) === "group") {
      const memberIds = await getGroupMemberUserIds(ctx, convo._id);
      recipientIds = memberIds.filter((id) => id !== message.senderUserId);
      groupTitle = await resolveGroupTitle(ctx, convo, message.senderUserId);
    } else {
      recipientIds = [otherParticipantId(convo, message.senderUserId)];
      dmTitle = senderName;
    }

    const messages: PushMessage[] = [];

    for (const recipientId of recipientIds) {
      if (!(await shouldNotifyUser(ctx, recipientId))) continue;

      const tokens = await getTokensForUser(ctx, recipientId);
      if (tokens.length === 0) continue;

      const title = dmTitle ?? groupTitle ?? "Oxformals";
      const body = dmTitle
        ? preview
        : `${senderName}: ${preview}`;

      for (const token of tokens) {
        messages.push({
          to: token,
          title,
          body,
          data,
          categoryId: CHAT_PUSH_CATEGORY_ID,
          channelId: CHAT_PUSH_CHANNEL_ID,
          collapseId: conversationId,
        });
      }
    }

    if (messages.length === 0) return null;
    return { messages };
  },
});

export const getWishlistListingPushPayload = internalQuery({
  args: { listingId: v.id("listings") },
  returns: pushPayloadValidator,
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.status !== "active") {
      return null;
    }

    const owner = await ctx.db.get(listing.ownerUserId);
    const posterName = owner?.name?.trim() || "Someone";
    const dateLabel = formatListingDate(listing.dateTime);
    const typeLabel = formatListingTypeLabel(listing);
    const title = `New ${listing.college} formal`;
    const body = `${posterName} · ${dateLabel} · ${typeLabel}`;
    const data = {
      url: `/listing/${args.listingId}`,
      listingId: args.listingId,
    };

    const rows = await ctx.db
      .query("collegeWishlists")
      .withIndex("by_college", (q) => q.eq("college", listing.college))
      .collect();

    const messages: PushMessage[] = [];
    const seen = new Set<string>();

    for (const row of rows) {
      if (row.userId === listing.ownerUserId) continue;
      if (seen.has(row.userId)) continue;
      seen.add(row.userId);

      if (!(await shouldNotifyUser(ctx, row.userId))) continue;

      const tokens = await getTokensForUser(ctx, row.userId);
      if (tokens.length === 0) continue;

      for (const token of tokens) {
        messages.push({ to: token, title, body, data });
      }
    }

    if (messages.length === 0) return null;
    return { messages };
  },
});

export const pruneInvalidPushTokens = internalMutation({
  args: { tokens: v.array(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const token of args.tokens) {
      const rows = await getPushTokenRowsByToken(ctx, token);
      for (const row of rows) {
        await ctx.db.delete(row._id);
      }
    }
    return null;
  },
});

export const sendChatMessagePush = internalAction({
  args: { messageId: v.id("messages") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const payload = await ctx.runQuery(internal.pushNotifications.getChatPushPayload, {
      messageId: args.messageId,
    });

    if (!payload || payload.messages.length === 0) {
      return null;
    }

    await deliverExpoPushMessages(ctx, payload.messages);
    return null;
  },
});

export const sendWishlistListingPush = internalAction({
  args: { listingId: v.id("listings") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const payload = await ctx.runQuery(
      internal.pushNotifications.getWishlistListingPushPayload,
      { listingId: args.listingId },
    );

    if (!payload || payload.messages.length === 0) {
      return null;
    }

    await deliverExpoPushMessages(ctx, payload.messages);
    return null;
  },
});
