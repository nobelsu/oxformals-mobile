import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  validateMentionStructure,
  validateMentionUsers,
} from "./chatMentions";
import { assertVerifiedEmail } from "./userVerification";

type Ctx = QueryCtx | MutationCtx;

const MAX_MESSAGE_LENGTH = 2000;
const REPLY_PREVIEW_MAX_LENGTH = 120;
const MAX_GROUP_SIZE = 7;
const MAX_GROUP_NAME_LENGTH = 80;

const chatMentionValidator = v.object({
  userId: v.id("users"),
  label: v.string(),
  start: v.number(),
});

const listingSummaryValidator = v.object({
  id: v.id("listings"),
  ownerUserId: v.id("users"),
  ownerName: v.string(),
  college: v.string(),
  dateTime: v.string(),
  status: v.union(
    v.literal("active"),
    v.literal("confirmed"),
    v.literal("closed"),
    v.literal("expired"),
  ),
  seatsAvailable: v.number(),
  listingType: v.optional(
    v.union(v.literal("swap"), v.literal("pay"), v.literal("both")),
  ),
  price: v.optional(v.number()),
});

const messageReplySnapshotValidator = v.object({
  id: v.id("messages"),
  senderUserId: v.id("users"),
  senderName: v.optional(v.string()),
  body: v.string(),
  referencedListing: v.optional(listingSummaryValidator),
  unavailable: v.optional(v.boolean()),
});

const avatarValue = v.union(
  v.object({ kind: v.literal("preset"), id: v.string() }),
  v.object({ kind: v.literal("image"), dataUrl: v.string() }),
);

const groupMemberPreviewValidator = v.object({
  id: v.id("users"),
  name: v.string(),
  avatar: v.optional(avatarValue),
});

const dmConversationPreviewValidator = v.object({
  kind: v.literal("dm"),
  id: v.id("conversations"),
  otherUserId: v.id("users"),
  otherUserName: v.string(),
  otherUserAvatar: v.optional(avatarValue),
  otherUserCollege: v.optional(v.string()),
  lastMessageAt: v.number(),
  lastMessageBody: v.optional(v.string()),
  lastMessageSenderId: v.optional(v.id("users")),
  unreadCount: v.number(),
});

const groupConversationPreviewValidator = v.object({
  kind: v.literal("group"),
  id: v.id("conversations"),
  title: v.string(),
  name: v.optional(v.string()),
  memberCount: v.number(),
  memberPreview: v.array(groupMemberPreviewValidator),
  createdByUserId: v.id("users"),
  isCreator: v.boolean(),
  lastMessageAt: v.number(),
  lastMessageBody: v.optional(v.string()),
  lastMessageSenderId: v.optional(v.id("users")),
  unreadCount: v.number(),
});

const conversationPreviewValidator = v.union(
  dmConversationPreviewValidator,
  groupConversationPreviewValidator,
);

export type ListingSummary = {
  id: Id<"listings">;
  ownerUserId: Id<"users">;
  ownerName: string;
  college: string;
  dateTime: string;
  status: Doc<"listings">["status"];
  seatsAvailable: number;
  listingType?: "swap" | "pay" | "both";
  price?: number;
};

function conversationKind(
  convo: Doc<"conversations">,
): "dm" | "group" {
  if (convo.kind === "group") return "group";
  return "dm";
}

function orderParticipants(
  a: Id<"users">,
  b: Id<"users">,
): [Id<"users">, Id<"users">] {
  return a < b ? [a, b] : [b, a];
}

function participantPairKey(
  participantLow: Id<"users">,
  participantHigh: Id<"users">,
): string {
  return `${participantLow}:${participantHigh}`;
}

async function toListingSummary(
  ctx: QueryCtx,
  listing: Doc<"listings">,
  ownerNameCache: Map<string, string>,
): Promise<ListingSummary> {
  const ownerName = await resolveSenderName(
    ctx,
    listing.ownerUserId,
    ownerNameCache,
  );
  return {
    id: listing._id,
    ownerUserId: listing.ownerUserId,
    ownerName,
    college: listing.college,
    dateTime: listing.dateTime,
    status: listing.status,
    seatsAvailable: listing.seatsAvailable,
    ...(listing.listingType !== undefined
      ? { listingType: listing.listingType }
      : {}),
    ...(listing.price !== undefined ? { price: listing.price } : {}),
  };
}

function truncateReplyBody(body: string): string {
  const trimmed = body.trim();
  if (trimmed.length <= REPLY_PREVIEW_MAX_LENGTH) return trimmed;
  return `${trimmed.slice(0, REPLY_PREVIEW_MAX_LENGTH)}…`;
}

async function resolveSenderName(
  ctx: QueryCtx,
  senderUserId: Id<"users">,
  cache: Map<string, string>,
): Promise<string> {
  let cached = cache.get(senderUserId);
  if (!cached) {
    const u = await ctx.db.get(senderUserId);
    cached = u?.name?.trim() || "User";
    cache.set(senderUserId, cached);
  }
  return cached;
}

async function buildReplySnapshot(
  ctx: QueryCtx,
  parent: Doc<"messages"> | null,
  clearedAt: number,
  senderNameCache: Map<string, string>,
): Promise<
  | {
      id: Id<"messages">;
      senderUserId: Id<"users">;
      senderName?: string;
      body: string;
      referencedListing?: ListingSummary;
      unavailable?: boolean;
    }
  | undefined
> {
  if (!parent) {
    return undefined;
  }

  if (parent._creationTime <= clearedAt) {
    return {
      id: parent._id,
      senderUserId: parent.senderUserId,
      body: "",
      unavailable: true,
    };
  }

  const ownerNameCache = new Map<string, string>();
  let referencedListing: ListingSummary | undefined;
  if (parent.referencedListingId) {
    const listing = await ctx.db.get(parent.referencedListingId);
    if (listing) {
      referencedListing = await toListingSummary(ctx, listing, ownerNameCache);
    }
  }

  const senderName = await resolveSenderName(
    ctx,
    parent.senderUserId,
    senderNameCache,
  );

  return {
    id: parent._id,
    senderUserId: parent.senderUserId,
    body: truncateReplyBody(parent.body),
    senderName,
    ...(referencedListing ? { referencedListing } : {}),
  };
}

async function requireUserId(ctx: Ctx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

async function getListingOrThrow(
  ctx: Ctx,
  listingId: Id<"listings">,
): Promise<Doc<"listings">> {
  const listing = await ctx.db.get(listingId);
  if (!listing) throw new Error("Listing not found");
  return listing;
}

async function getMemberRow(
  ctx: Ctx,
  conversationId: Id<"conversations">,
  userId: Id<"users">,
): Promise<Doc<"conversationMembers"> | null> {
  return await ctx.db
    .query("conversationMembers")
    .withIndex("by_userId_and_conversationId", (q) =>
      q.eq("userId", userId).eq("conversationId", conversationId),
    )
    .unique();
}

async function isParticipant(
  ctx: Ctx,
  convo: Doc<"conversations">,
  userId: Id<"users">,
): Promise<boolean> {
  if (conversationKind(convo) === "group") {
    const row = await getMemberRow(ctx, convo._id, userId);
    return row !== null;
  }
  return (
    convo.participantLow === userId || convo.participantHigh === userId
  );
}

async function requireConversationParticipant(
  ctx: Ctx,
  conversationId: Id<"conversations">,
  userId: Id<"users">,
): Promise<Doc<"conversations">> {
  const convo = await ctx.db.get(conversationId);
  if (!convo) throw new Error("Conversation not found");
  if (!(await isParticipant(ctx, convo, userId))) {
    throw new Error("Not allowed to access this conversation");
  }
  return convo;
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

async function getLastReadAt(
  ctx: Ctx,
  convo: Doc<"conversations">,
  userId: Id<"users">,
): Promise<number> {
  if (conversationKind(convo) === "group") {
    const row = await getMemberRow(ctx, convo._id, userId);
    return row?.lastReadAt ?? 0;
  }
  if (userId === convo.participantLow) {
    return convo.participantLowLastReadAt ?? 0;
  }
  return convo.participantHighLastReadAt ?? 0;
}

function getDmClearedAt(
  convo: Doc<"conversations">,
  userId: Id<"users">,
): number {
  if (userId === convo.participantLow) {
    return convo.participantLowClearedAt ?? 0;
  }
  return convo.participantHighClearedAt ?? 0;
}

async function getClearedAt(
  convo: Doc<"conversations">,
  userId: Id<"users">,
): Promise<number> {
  if (conversationKind(convo) === "group") return 0;
  return getDmClearedAt(convo, userId);
}

async function countUnreadMessages(
  ctx: QueryCtx,
  convo: Doc<"conversations">,
  viewerId: Id<"users">,
): Promise<number> {
  const lastReadAt = await getLastReadAt(ctx, convo, viewerId);
  const clearedAt = await getClearedAt(convo, viewerId);
  const messages = await ctx.db
    .query("messages")
    .withIndex("by_conversationId", (q) =>
      q.eq("conversationId", convo._id),
    )
    .order("desc")
    .take(100);

  let count = 0;
  for (const msg of messages) {
    if (msg._creationTime <= clearedAt) break;
    if (msg._creationTime <= lastReadAt) break;
    if (msg.senderUserId !== viewerId) count++;
  }
  return count;
}

async function getGroupMemberUserIds(
  ctx: Ctx,
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

async function isListingReferableInDm(
  _ctx: Ctx,
  listing: Doc<"listings">,
  viewerId: Id<"users">,
  otherUserId: Id<"users">,
): Promise<boolean> {
  return (
    listing.ownerUserId === viewerId || listing.ownerUserId === otherUserId
  );
}

async function isListingReferableInGroup(
  _ctx: Ctx,
  listing: Doc<"listings">,
  memberUserIds: Id<"users">[],
): Promise<boolean> {
  return memberUserIds.includes(listing.ownerUserId);
}

async function getLastMessage(
  ctx: QueryCtx,
  conversationId: Id<"conversations">,
): Promise<Doc<"messages"> | null> {
  const messages = await ctx.db
    .query("messages")
    .withIndex("by_conversationId", (q) =>
      q.eq("conversationId", conversationId),
    )
    .order("desc")
    .take(1);
  return messages[0] ?? null;
}

async function getLastVisibleMessage(
  ctx: QueryCtx,
  conversationId: Id<"conversations">,
  clearedAt: number,
): Promise<Doc<"messages"> | null> {
  if (clearedAt === 0) {
    return await getLastMessage(ctx, conversationId);
  }
  const messages = await ctx.db
    .query("messages")
    .withIndex("by_conversationId", (q) =>
      q.eq("conversationId", conversationId),
    )
    .order("desc")
    .take(50);
  for (const msg of messages) {
    if (msg._creationTime > clearedAt) return msg;
  }
  return null;
}

async function getLastMessageForViewer(
  ctx: QueryCtx,
  convo: Doc<"conversations">,
  viewerId: Id<"users">,
): Promise<Doc<"messages"> | null> {
  const clearedAt = await getClearedAt(convo, viewerId);
  return await getLastVisibleMessage(ctx, convo._id, clearedAt);
}

async function buildDmConversationPreview(
  ctx: QueryCtx,
  convo: Doc<"conversations">,
  viewerId: Id<"users">,
): Promise<{
  kind: "dm";
  id: Id<"conversations">;
  otherUserId: Id<"users">;
  otherUserName: string;
  otherUserAvatar?: Doc<"users">["avatar"];
  otherUserCollege?: string;
  lastMessageAt: number;
  lastMessageBody?: string;
  lastMessageSenderId?: Id<"users">;
  unreadCount: number;
} | null> {
  const otherUserId = otherParticipantId(convo, viewerId);
  const otherUser = await ctx.db.get(otherUserId);
  if (!otherUser) return null;

  const clearedAt = getDmClearedAt(convo, viewerId);
  const lastMsg = await getLastVisibleMessage(ctx, convo._id, clearedAt);
  const unreadCount = await countUnreadMessages(ctx, convo, viewerId);

  return {
    kind: "dm",
    id: convo._id,
    otherUserId,
    otherUserName: otherUser.name?.trim() || "User",
    ...(otherUser.avatar ? { otherUserAvatar: otherUser.avatar } : {}),
    ...(otherUser.college?.trim()
      ? { otherUserCollege: otherUser.college.trim() }
      : {}),
    lastMessageAt: convo.lastMessageAt,
    unreadCount,
    ...(lastMsg
      ? {
          lastMessageBody: lastMsg.body,
          lastMessageSenderId: lastMsg.senderUserId,
        }
      : {}),
  };
}

async function buildGroupConversationPreview(
  ctx: QueryCtx,
  convo: Doc<"conversations">,
  viewerId: Id<"users">,
): Promise<{
  kind: "group";
  id: Id<"conversations">;
  title: string;
  name?: string;
  memberCount: number;
  memberPreview: {
    id: Id<"users">;
    name: string;
    avatar?: Doc<"users">["avatar"];
  }[];
  createdByUserId: Id<"users">;
  isCreator: boolean;
  lastMessageAt: number;
  lastMessageBody?: string;
  lastMessageSenderId?: Id<"users">;
  unreadCount: number;
} | null> {
  const memberRows = await ctx.db
    .query("conversationMembers")
    .withIndex("by_conversationId", (q) =>
      q.eq("conversationId", convo._id),
    )
    .collect();

  if (!memberRows.some((r) => r.userId === viewerId)) return null;

  const sorted = [...memberRows].sort((a, b) => a.joinedAt - b.joinedAt);
  const others = sorted.filter((r) => r.userId !== viewerId);

  const otherMembers: {
    id: Id<"users">;
    name: string;
    avatar?: Doc<"users">["avatar"];
  }[] = [];
  for (const row of others) {
    const u = await ctx.db.get(row.userId);
    otherMembers.push({
      id: row.userId,
      name: u?.name?.trim() || "User",
      ...(u?.avatar ? { avatar: u.avatar } : {}),
    });
  }

  const memberPreview = otherMembers.slice(0, 3);

  const customName = convo.name?.trim();
  const title =
    customName ||
    otherMembers.map((m) => m.name).join(", ") ||
    "Group chat";

  const lastMsg = await getLastMessage(ctx, convo._id);
  const unreadCount = await countUnreadMessages(ctx, convo, viewerId);
  const createdByUserId = convo.createdByUserId ?? viewerId;

  return {
    kind: "group",
    id: convo._id,
    title,
    ...(customName ? { name: customName } : {}),
    memberCount: memberRows.length,
    memberPreview,
    createdByUserId,
    isCreator: createdByUserId === viewerId,
    lastMessageAt: convo.lastMessageAt,
    unreadCount,
    ...(lastMsg
      ? {
          lastMessageBody: lastMsg.body,
          lastMessageSenderId: lastMsg.senderUserId,
        }
      : {}),
  };
}

async function buildConversationPreview(
  ctx: QueryCtx,
  convo: Doc<"conversations">,
  viewerId: Id<"users">,
) {
  if (conversationKind(convo) === "group") {
    return await buildGroupConversationPreview(ctx, convo, viewerId);
  }
  return await buildDmConversationPreview(ctx, convo, viewerId);
}

function dedupeConversationsByPair(
  convos: Doc<"conversations">[],
): Doc<"conversations">[] {
  const byPair = new Map<string, Doc<"conversations">>();
  for (const convo of convos) {
    if (conversationKind(convo) !== "dm") continue;
    if (!convo.participantLow || !convo.participantHigh) continue;
    const key = participantPairKey(convo.participantLow, convo.participantHigh);
    const existing = byPair.get(key);
    if (!existing || convo.lastMessageAt > existing.lastMessageAt) {
      byPair.set(key, convo);
    }
  }
  return [...byPair.values()].sort((a, b) => b.lastMessageAt - a.lastMessageAt);
}

async function insertGroupMembers(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
  memberUserIds: Id<"users">[],
  joinedAt: number,
): Promise<void> {
  for (const userId of memberUserIds) {
    await ctx.db.insert("conversationMembers", {
      conversationId,
      userId,
      joinedAt,
    });
  }
}

async function deleteGroupConversation(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
): Promise<void> {
  const members = await ctx.db
    .query("conversationMembers")
    .withIndex("by_conversationId", (q) =>
      q.eq("conversationId", conversationId),
    )
    .collect();
  for (const m of members) {
    await ctx.db.delete(m._id);
  }
  await ctx.db.delete(conversationId);
}

export const getOrCreateConversation = mutation({
  args: { otherUserId: v.id("users") },
  returns: v.id("conversations"),
  handler: async (ctx, args) => {
    const viewerId = await requireUserId(ctx);
    if (args.otherUserId === viewerId) {
      throw new Error("You cannot message yourself");
    }
    const otherUser = await ctx.db.get(args.otherUserId);
    if (!otherUser) throw new Error("User not found");
    assertVerifiedEmail(otherUser);

    const [participantLow, participantHigh] = orderParticipants(
      viewerId,
      args.otherUserId,
    );

    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_participants", (q) =>
        q
          .eq("participantLow", participantLow)
          .eq("participantHigh", participantHigh),
      )
      .unique();

    if (existing) return existing._id;

    return await ctx.db.insert("conversations", {
      kind: "dm",
      participantLow,
      participantHigh,
      lastMessageAt: 0,
    });
  },
});

export const createGroupConversation = mutation({
  args: {
    memberUserIds: v.array(v.id("users")),
    name: v.optional(v.string()),
  },
  returns: v.id("conversations"),
  handler: async (ctx, args) => {
    const viewerId = await requireUserId(ctx);
    const uniqueIds = [...new Set(args.memberUserIds)];
    if (!uniqueIds.includes(viewerId)) {
      throw new Error("You must include yourself in the group");
    }
    if (uniqueIds.length < 2) {
      throw new Error("A group needs at least 2 members");
    }
    if (uniqueIds.length > MAX_GROUP_SIZE) {
      throw new Error(`Groups can have at most ${MAX_GROUP_SIZE} members`);
    }

    const name = args.name?.trim();
    if (name && name.length > MAX_GROUP_NAME_LENGTH) {
      throw new Error(
        `Group name must be at most ${MAX_GROUP_NAME_LENGTH} characters`,
      );
    }

    for (const id of uniqueIds) {
      const u = await ctx.db.get(id);
      if (!u) throw new Error("User not found");
      if (id !== viewerId) assertVerifiedEmail(u);
    }

    const now = Date.now();
    const conversationId = await ctx.db.insert("conversations", {
      kind: "group",
      lastMessageAt: 0,
      createdByUserId: viewerId,
      ...(name ? { name } : {}),
    });

    await insertGroupMembers(ctx, conversationId, uniqueIds, now);
    return conversationId;
  },
});

export const renameGroupConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const viewerId = await requireUserId(ctx);
    const convo = await ctx.db.get(args.conversationId);
    if (!convo || conversationKind(convo) !== "group") {
      throw new Error("Group not found");
    }
    if (convo.createdByUserId !== viewerId) {
      throw new Error("Only the group creator can rename the group");
    }

    const trimmed = args.name.trim();
    if (trimmed.length > MAX_GROUP_NAME_LENGTH) {
      throw new Error(
        `Group name must be at most ${MAX_GROUP_NAME_LENGTH} characters`,
      );
    }

    await ctx.db.patch(args.conversationId, {
      name: trimmed || undefined,
    });
    return null;
  },
});

export const addGroupMember = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const viewerId = await requireUserId(ctx);
    const convo = await ctx.db.get(args.conversationId);
    if (!convo || conversationKind(convo) !== "group") {
      throw new Error("Group not found");
    }
    if (convo.createdByUserId !== viewerId) {
      throw new Error("Only the group creator can add members");
    }

    const existing = await getMemberRow(ctx, args.conversationId, args.userId);
    if (existing) throw new Error("User is already in the group");

    const members = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();
    if (members.length >= MAX_GROUP_SIZE) {
      throw new Error(`Groups can have at most ${MAX_GROUP_SIZE} members`);
    }

    const u = await ctx.db.get(args.userId);
    if (!u) throw new Error("User not found");
    assertVerifiedEmail(u);

    await ctx.db.insert("conversationMembers", {
      conversationId: args.conversationId,
      userId: args.userId,
      joinedAt: Date.now(),
    });
    return null;
  },
});

export const removeGroupMember = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const viewerId = await requireUserId(ctx);
    const convo = await ctx.db.get(args.conversationId);
    if (!convo || conversationKind(convo) !== "group") {
      throw new Error("Group not found");
    }
    if (convo.createdByUserId !== viewerId) {
      throw new Error("Only the group creator can remove members");
    }
    if (args.userId === viewerId) {
      throw new Error("Use leave group to remove yourself");
    }

    const row = await getMemberRow(ctx, args.conversationId, args.userId);
    if (!row) throw new Error("User is not in the group");
    await ctx.db.delete(row._id);
    return null;
  },
});

export const leaveGroupConversation = mutation({
  args: { conversationId: v.id("conversations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const viewerId = await requireUserId(ctx);
    const convo = await ctx.db.get(args.conversationId);
    if (!convo || conversationKind(convo) !== "group") {
      throw new Error("Group not found");
    }

    const myRow = await getMemberRow(ctx, args.conversationId, viewerId);
    if (!myRow) throw new Error("You are not in this group");

    const allMembers = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();

    if (allMembers.length === 1) {
      await deleteGroupConversation(ctx, args.conversationId);
      return null;
    }

    await ctx.db.delete(myRow._id);

    if (convo.createdByUserId === viewerId) {
      const remaining = allMembers.filter((m) => m._id !== myRow._id);
      const nextCreator = [...remaining].sort(
        (a, b) => a.joinedAt - b.joinedAt,
      )[0];
      if (nextCreator) {
        await ctx.db.patch(args.conversationId, {
          createdByUserId: nextCreator.userId,
        });
      }
    }

    return null;
  },
});

export const getOrCreateListingGroupChat = mutation({
  args: { listingId: v.id("listings") },
  returns: v.id("conversations"),
  handler: async (ctx, args) => {
    const viewerId = await requireUserId(ctx);
    const listing = await getListingOrThrow(ctx, args.listingId);

    if (!listing.members.includes(viewerId)) {
      throw new Error("You are not a member of this listing");
    }
    if (listing.members.length < 2) {
      throw new Error("Need at least 2 people dining together for a group chat");
    }
    if (listing.members.length > MAX_GROUP_SIZE) {
      throw new Error(`Groups can have at most ${MAX_GROUP_SIZE} members`);
    }

    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_sourceListingId", (q) =>
        q.eq("sourceListingId", args.listingId),
      )
      .unique();

    if (existing) {
      const row = await getMemberRow(ctx, existing._id, viewerId);
      if (!row) {
        const members = await ctx.db
          .query("conversationMembers")
          .withIndex("by_conversationId", (q) =>
            q.eq("conversationId", existing._id),
          )
          .collect();
        if (members.length >= MAX_GROUP_SIZE) {
          throw new Error(`Groups can have at most ${MAX_GROUP_SIZE} members`);
        }
        await ctx.db.insert("conversationMembers", {
          conversationId: existing._id,
          userId: viewerId,
          joinedAt: Date.now(),
        });
      }
      return existing._id;
    }

    const now = Date.now();
    const title = `${listing.college} formal`;
    const conversationId = await ctx.db.insert("conversations", {
      kind: "group",
      lastMessageAt: 0,
      createdByUserId: viewerId,
      sourceListingId: args.listingId,
      name: title,
    });

    const memberIds = [...new Set(listing.members)];
    await insertGroupMembers(ctx, conversationId, memberIds, now);
    return conversationId;
  },
});

export const getListingGroupConversation = query({
  args: { listingId: v.id("listings") },
  returns: v.union(v.id("conversations"), v.null()),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_sourceListingId", (q) =>
        q.eq("sourceListingId", args.listingId),
      )
      .unique();

    if (!existing) return null;
    if (!(await isParticipant(ctx, existing, userId))) return null;
    return existing._id;
  },
});

export const listGroupMembers = query({
  args: { conversationId: v.id("conversations") },
  returns: v.array(
    v.object({
      id: v.id("users"),
      name: v.string(),
      college: v.optional(v.string()),
      joinedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const convo = await requireConversationParticipant(
      ctx,
      args.conversationId,
      userId,
    );
    if (conversationKind(convo) !== "group") {
      throw new Error("Not a group conversation");
    }

    const rows = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();

    const sorted = [...rows].sort((a, b) => a.joinedAt - b.joinedAt);
    const result: {
      id: Id<"users">;
      name: string;
      college?: string;
      joinedAt: number;
    }[] = [];

    for (const row of sorted) {
      const u = await ctx.db.get(row.userId);
      result.push({
        id: row.userId,
        name: u?.name?.trim() || "User",
        ...(u?.college?.trim() ? { college: u.college.trim() } : {}),
        joinedAt: row.joinedAt,
      });
    }
    return result;
  },
});

export const getConversation = query({
  args: { conversationId: v.id("conversations") },
  returns: v.union(conversationPreviewValidator, v.null()),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const convo = await ctx.db.get(args.conversationId);
    if (!convo || !(await isParticipant(ctx, convo, userId))) return null;
    return await buildConversationPreview(ctx, convo, userId);
  },
});

function searchUsersByPrefix(
  users: Doc<"users">[],
  viewerId: Id<"users">,
  q: string,
  limit: number,
  excludeIds?: Set<string>,
): { id: Id<"users">; name: string; college?: string }[] {
  const normalized = q.trim().toLowerCase();
  if (normalized.length < 1) return [];

  return users
    .filter((u) => u._id !== viewerId && (u.name?.trim() ?? "").length > 0)
    .filter((u) => !excludeIds?.has(u._id))
    .filter((u) => {
      const name = u.name!.trim().replace(/\s+/g, " ").toLowerCase();
      return name.startsWith(normalized);
    })
    .slice(0, limit)
    .map((u) => ({
      id: u._id,
      name: u.name!.trim().replace(/\s+/g, " "),
      ...(u.college?.trim() ? { college: u.college.trim() } : {}),
    }));
}

export const searchUsersForChat = query({
  args: { query: v.string() },
  returns: v.array(
    v.object({
      id: v.id("users"),
      name: v.string(),
      college: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const q = args.query.trim().toLowerCase();
    if (q.length < 2) return [];

    const users = await ctx.db.query("users").take(500);
    return users
      .filter((u) => u._id !== userId && (u.name?.trim() ?? "").length > 0)
      .filter((u) => {
        const name = u.name!.toLowerCase();
        const college = (u.college ?? "").toLowerCase();
        return name.includes(q) || college.includes(q);
      })
      .slice(0, 15)
      .map((u) => ({
        id: u._id,
        name: u.name!.trim(),
        ...(u.college?.trim() ? { college: u.college.trim() } : {}),
      }));
  },
});

export const searchUsersForMention = query({
  args: {
    query: v.string(),
    conversationId: v.optional(v.id("conversations")),
  },
  returns: v.array(
    v.object({
      id: v.id("users"),
      name: v.string(),
      college: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    if (args.conversationId) {
      const convo = await ctx.db.get(args.conversationId);
      if (convo && (await isParticipant(ctx, convo, userId))) {
        if (conversationKind(convo) === "group") {
          const memberIds = await getGroupMemberUserIds(ctx, convo._id);
          const users: Doc<"users">[] = [];
          for (const id of memberIds) {
            const u = await ctx.db.get(id);
            if (u) users.push(u);
          }
          return searchUsersByPrefix(users, userId, args.query, 15);
        }
      }
    }

    const users = await ctx.db.query("users").take(500);
    return searchUsersByPrefix(users, userId, args.query, 15);
  },
});

export const getTotalUnreadCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    const [asLow, asHigh, memberRows] = await Promise.all([
      ctx.db
        .query("conversations")
        .withIndex("by_participantLow", (q) => q.eq("participantLow", userId))
        .order("desc")
        .take(100),
      ctx.db
        .query("conversations")
        .withIndex("by_participantHigh", (q) =>
          q.eq("participantHigh", userId),
        )
        .order("desc")
        .take(100),
      ctx.db
        .query("conversationMembers")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .take(100),
    ]);

    const dedupedDms = dedupeConversationsByPair([...asLow, ...asHigh]);
    const groupConvos: Doc<"conversations">[] = [];
    const seenGroup = new Set<string>();
    for (const row of memberRows) {
      if (seenGroup.has(row.conversationId)) continue;
      seenGroup.add(row.conversationId);
      const convo = await ctx.db.get(row.conversationId);
      if (convo && conversationKind(convo) === "group") {
        groupConvos.push(convo);
      }
    }

    let total = 0;
    for (const convo of [...dedupedDms, ...groupConvos]) {
      const lastMsg = await getLastMessageForViewer(ctx, convo, userId);
      if (!lastMsg) continue;
      total += await countUnreadMessages(ctx, convo, userId);
    }
    return total;
  },
});

export const clearConversation = mutation({
  args: { conversationId: v.id("conversations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const convo = await requireConversationParticipant(
      ctx,
      args.conversationId,
      userId,
    );
    if (conversationKind(convo) !== "dm") {
      throw new Error("Only direct chats can be cleared");
    }

    const now = Date.now();
    if (userId === convo.participantLow) {
      await ctx.db.patch(args.conversationId, {
        participantLowClearedAt: now,
        participantLowLastReadAt: now,
      });
    } else {
      await ctx.db.patch(args.conversationId, {
        participantHighClearedAt: now,
        participantHighLastReadAt: now,
      });
    }
    return null;
  },
});

export const markConversationRead = mutation({
  args: { conversationId: v.id("conversations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const convo = await requireConversationParticipant(
      ctx,
      args.conversationId,
      userId,
    );
    const readAt = Math.max(Date.now(), convo.lastMessageAt);

    if (conversationKind(convo) === "group") {
      const row = await getMemberRow(ctx, args.conversationId, userId);
      if (row) {
        await ctx.db.patch(row._id, { lastReadAt: readAt });
      }
    } else if (userId === convo.participantLow) {
      await ctx.db.patch(args.conversationId, {
        participantLowLastReadAt: readAt,
      });
    } else {
      await ctx.db.patch(args.conversationId, {
        participantHighLastReadAt: readAt,
      });
    }
    return null;
  },
});

export const listMyConversations = query({
  args: {},
  returns: v.array(conversationPreviewValidator),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const [asLow, asHigh, memberRows] = await Promise.all([
      ctx.db
        .query("conversations")
        .withIndex("by_participantLow", (q) => q.eq("participantLow", userId))
        .order("desc")
        .take(100),
      ctx.db
        .query("conversations")
        .withIndex("by_participantHigh", (q) =>
          q.eq("participantHigh", userId),
        )
        .order("desc")
        .take(100),
      ctx.db
        .query("conversationMembers")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .take(100),
    ]);

    const dedupedDms = dedupeConversationsByPair([...asLow, ...asHigh]);
    const groupConvos: Doc<"conversations">[] = [];
    const seenGroup = new Set<string>();
    for (const row of memberRows) {
      if (seenGroup.has(row.conversationId)) continue;
      seenGroup.add(row.conversationId);
      const convo = await ctx.db.get(row.conversationId);
      if (convo && conversationKind(convo) === "group") {
        groupConvos.push(convo);
      }
    }

    const allConvos = [...dedupedDms, ...groupConvos];

    const results = await Promise.all(
      allConvos.map(async (convo) => {
        const lastMsg = await getLastMessageForViewer(ctx, convo, userId);
        if (!lastMsg) return null;
        const preview = await buildConversationPreview(ctx, convo, userId);
        if (!preview) return null;
        return { ...preview, lastMessageAt: lastMsg._creationTime };
      }),
    );

    return results
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  },
});

export const listMessages = query({
  args: {
    conversationId: v.id("conversations"),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(
      v.object({
        id: v.id("messages"),
        conversationId: v.id("conversations"),
        senderUserId: v.id("users"),
        senderName: v.optional(v.string()),
        body: v.string(),
        createdAt: v.number(),
        referencedListing: v.optional(listingSummaryValidator),
        mentions: v.optional(v.array(chatMentionValidator)),
        replyTo: v.optional(messageReplySnapshotValidator),
      }),
    ),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const convo = await requireConversationParticipant(
      ctx,
      args.conversationId,
      userId,
    );
    const isGroup = conversationKind(convo) === "group";
    const clearedAt = await getClearedAt(convo, userId);

    const result = await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .filter((q) => q.gt(q.field("_creationTime"), clearedAt))
      .order("desc")
      .paginate(args.paginationOpts);

    const senderNameCache = new Map<string, string>();

    const replyParentIds = [
      ...new Set(
        result.page
          .map((msg) => msg.replyToMessageId)
          .filter((id): id is Id<"messages"> => id !== undefined),
      ),
    ];
    const replyParentCache = new Map<string, Doc<"messages"> | null>();
    await Promise.all(
      replyParentIds.map(async (parentId) => {
        const parent = await ctx.db.get(parentId);
        replyParentCache.set(parentId, parent);
      }),
    );

    const ownerNameCache = new Map<string, string>();
    const page = await Promise.all(
      result.page.map(async (msg) => {
        let referencedListing: ListingSummary | undefined;
        if (msg.referencedListingId) {
          const listing = await ctx.db.get(msg.referencedListingId);
          if (listing) {
            referencedListing = await toListingSummary(
              ctx,
              listing,
              ownerNameCache,
            );
          }
        }

        let senderName: string | undefined;
        if (isGroup || msg.senderUserId !== userId) {
          senderName = await resolveSenderName(
            ctx,
            msg.senderUserId,
            senderNameCache,
          );
        }

        let replyTo:
          | {
              id: Id<"messages">;
              senderUserId: Id<"users">;
              senderName?: string;
              body: string;
              referencedListing?: ListingSummary;
              unavailable?: boolean;
            }
          | undefined;
        if (msg.replyToMessageId) {
          const parent =
            replyParentCache.get(msg.replyToMessageId) ?? null;
          replyTo = await buildReplySnapshot(
            ctx,
            parent,
            clearedAt,
            senderNameCache,
          );
        }

        return {
          id: msg._id,
          conversationId: msg.conversationId,
          senderUserId: msg.senderUserId,
          body: msg.body,
          createdAt: msg._creationTime,
          ...(senderName ? { senderName } : {}),
          ...(referencedListing ? { referencedListing } : {}),
          ...(msg.mentions && msg.mentions.length > 0
            ? { mentions: msg.mentions }
            : {}),
          ...(replyTo ? { replyTo } : {}),
        };
      }),
    );

    return {
      page,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    body: v.string(),
    referencedListingId: v.optional(v.id("listings")),
    mentions: v.optional(v.array(chatMentionValidator)),
    replyToMessageId: v.optional(v.id("messages")),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const convo = await requireConversationParticipant(
      ctx,
      args.conversationId,
      userId,
    );

    const clearedAt = await getClearedAt(convo, userId);

    if (args.replyToMessageId) {
      const parent = await ctx.db.get(args.replyToMessageId);
      if (!parent) {
        throw new Error("The message you are replying to no longer exists");
      }
      if (parent.conversationId !== args.conversationId) {
        throw new Error("Cannot reply to a message from another conversation");
      }
      if (parent._creationTime <= clearedAt) {
        throw new Error("Cannot reply to a message that is no longer visible");
      }
    }

    const body = args.body.trim();
    if (!body && !args.referencedListingId) {
      throw new Error("Message must have text or a listing reference");
    }
    if (body.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`Message must be at most ${MAX_MESSAGE_LENGTH} characters`);
    }

    const rawMentions = args.mentions ?? [];
    const structureResult = validateMentionStructure(body, rawMentions);
    if (!structureResult.ok) {
      throw new Error(structureResult.error);
    }
    const userResult = await validateMentionUsers(
      ctx,
      structureResult.mentions,
    );
    if (!userResult.ok) {
      throw new Error(userResult.error);
    }
    const validatedMentions = userResult.mentions;

    if (args.referencedListingId) {
      const listing = await getListingOrThrow(ctx, args.referencedListingId);
      if (conversationKind(convo) === "group") {
        const memberIds = await getGroupMemberUserIds(ctx, convo._id);
        const referable = await isListingReferableInGroup(
          ctx,
          listing,
          memberIds,
        );
        if (!referable) {
          throw new Error("You cannot reference that listing in this conversation");
        }
      } else {
        const otherUserId = otherParticipantId(convo, userId);
        const referable = await isListingReferableInDm(
          ctx,
          listing,
          userId,
          otherUserId,
        );
        if (!referable) {
          throw new Error("You cannot reference that listing in this conversation");
        }
      }
    }

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderUserId: userId,
      body,
      ...(args.replyToMessageId
        ? { replyToMessageId: args.replyToMessageId }
        : {}),
      ...(args.referencedListingId
        ? { referencedListingId: args.referencedListingId }
        : {}),
      ...(validatedMentions.length > 0
        ? { mentions: validatedMentions }
        : {}),
    });

    const message = await ctx.db.get(messageId);
    if (!message) throw new Error("Failed to create message");
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: message._creationTime,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.pushNotifications.sendChatMessagePush,
      { messageId },
    );

    return messageId;
  },
});

export const resolveReferableListing = query({
  args: {
    conversationId: v.id("conversations"),
    listingId: v.id("listings"),
  },
  returns: v.union(listingSummaryValidator, v.null()),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const convo = await requireConversationParticipant(
      ctx,
      args.conversationId,
      userId,
    );
    const listing = await ctx.db.get(args.listingId);
    if (!listing) return null;

    if (conversationKind(convo) === "group") {
      const memberIds = await getGroupMemberUserIds(ctx, convo._id);
      const referable = await isListingReferableInGroup(
        ctx,
        listing,
        memberIds,
      );
      if (!referable) return null;
    } else {
      const otherUserId = otherParticipantId(convo, userId);
      const referable = await isListingReferableInDm(
        ctx,
        listing,
        userId,
        otherUserId,
      );
      if (!referable) return null;
    }
    return await toListingSummary(ctx, listing, new Map());
  },
});

export const listReferableListings = query({
  args: { conversationId: v.id("conversations") },
  returns: v.array(listingSummaryValidator),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const convo = await requireConversationParticipant(
      ctx,
      args.conversationId,
      userId,
    );

    const summaries: ListingSummary[] = [];
    const seen = new Set<string>();
    const ownerNameCache = new Map<string, string>();

    const addListing = async (listing: Doc<"listings">) => {
      const key = listing._id;
      if (seen.has(key)) return;
      seen.add(key);
      summaries.push(await toListingSummary(ctx, listing, ownerNameCache));
    };

    if (conversationKind(convo) === "group") {
      const memberIds = await getGroupMemberUserIds(ctx, convo._id);
      for (const memberId of memberIds) {
        const listings = await ctx.db
          .query("listings")
          .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", memberId))
          .collect();
        for (const listing of listings) {
          await addListing(listing);
        }
      }
    } else {
      const otherId = otherParticipantId(convo, userId);

      const myListings = await ctx.db
        .query("listings")
        .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", userId))
        .collect();
      for (const listing of myListings) {
        await addListing(listing);
      }

      const theirListings = await ctx.db
        .query("listings")
        .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", otherId))
        .collect();
      for (const listing of theirListings) {
        await addListing(listing);
      }
    }

    return summaries;
  },
});
