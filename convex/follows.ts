import { v } from "convex/values";
import { blockedEitherWay } from "./blocks";
import type { Doc, Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import {
  optionalUserId,
  requireActiveUser,
  sanitizeLimitedUser,
  sanitizePublicUser,
} from "./guards";
import { notify } from "./notify";

/**
 * Instagram/Beli-style follows. Following is instant, unless the other person
 * is private — then it waits for them to approve. Two people who follow each
 * other are friends (they can name each other in group requests).
 */

type Ctx = QueryCtx | MutationCtx;

/** Lists and counts are bounded; counts past this show as "500+". */
export const FOLLOW_LIST_LIMIT = 500;

async function followRow(
  ctx: Ctx,
  followerId: Id<"users">,
  followeeId: Id<"users">,
) {
  return await ctx.db
    .query("follows")
    .withIndex("by_followerId_and_followeeId", (q) =>
      q.eq("followerId", followerId).eq("followeeId", followeeId),
    )
    .unique();
}

export async function isActiveFollower(
  ctx: Ctx,
  followerId: Id<"users">,
  followeeId: Id<"users">,
): Promise<boolean> {
  const row = await followRow(ctx, followerId, followeeId);
  return row?.status === "active";
}

export async function areFriends(
  ctx: Ctx,
  a: Id<"users">,
  b: Id<"users">,
): Promise<boolean> {
  return (await isActiveFollower(ctx, a, b)) && (await isActiveFollower(ctx, b, a));
}

/**
 * Whether `viewerId` may see `owner`'s activity (reviews, formals attended,
 * badges, feed items). Public accounts: everyone. Private: themselves and
 * approved followers.
 */
export async function canSeeActivity(
  ctx: Ctx,
  viewerId: Id<"users"> | null,
  owner: Pick<Doc<"users">, "_id" | "isPrivate"> | null,
): Promise<boolean> {
  if (!owner) return false;
  if (viewerId && viewerId !== owner._id && (await blockedEitherWay(ctx, viewerId, owner._id))) {
    return false;
  }
  if (owner.isPrivate !== true) return true;
  if (!viewerId) return false;
  if (viewerId === owner._id) return true;
  return await isActiveFollower(ctx, viewerId, owner._id);
}

/** Memoised `canSeeActivity` for queries that check many authors. */
export function activityVisibility(ctx: Ctx, viewerId: Id<"users"> | null) {
  const cache = new Map<string, boolean>();
  return async (userId: Id<"users">): Promise<boolean> => {
    const hit = cache.get(userId);
    if (hit !== undefined) return hit;
    const user = await ctx.db.get(userId);
    const visible = await canSeeActivity(ctx, viewerId, user);
    cache.set(userId, visible);
    return visible;
  };
}

async function countFollows(
  ctx: Ctx,
  userId: Id<"users">,
  direction: "followers" | "following",
): Promise<number> {
  const rows =
    direction === "followers"
      ? await ctx.db
          .query("follows")
          .withIndex("by_followeeId_and_status", (q) =>
            q.eq("followeeId", userId).eq("status", "active"),
          )
          .take(FOLLOW_LIST_LIMIT + 1)
      : await ctx.db
          .query("follows")
          .withIndex("by_followerId_and_status", (q) =>
            q.eq("followerId", userId).eq("status", "active"),
          )
          .take(FOLLOW_LIST_LIMIT + 1);
  return rows.length;
}

export const getFollowState = query({
  args: { userId: v.id("users") },
  returns: v.union(
    v.null(),
    v.object({
      isSelf: v.boolean(),
      isPrivate: v.boolean(),
      following: v.union(v.literal("none"), v.literal("pending"), v.literal("active")),
      followsYou: v.boolean(),
      canSeeActivity: v.boolean(),
      followers: v.number(),
      followingCount: v.number(),
      requests: v.number(),
    }),
  ),
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user || user.deletedAt) return null;
    const viewerId = await optionalUserId(ctx);
    const isSelf = viewerId === userId;
    const mine = viewerId && !isSelf ? await followRow(ctx, viewerId, userId) : null;
    const theirs = viewerId && !isSelf ? await followRow(ctx, userId, viewerId) : null;
    const requests = isSelf
      ? (
          await ctx.db
            .query("follows")
            .withIndex("by_followeeId_and_status", (q) =>
              q.eq("followeeId", userId).eq("status", "pending"),
            )
            .take(100)
        ).length
      : 0;
    return {
      isSelf,
      isPrivate: user.isPrivate === true,
      following: mine ? mine.status : ("none" as const),
      followsYou: theirs?.status === "active",
      canSeeActivity: await canSeeActivity(ctx, viewerId, user),
      followers: await countFollows(ctx, userId, "followers"),
      followingCount: await countFollows(ctx, userId, "following"),
      requests,
    };
  },
});

export const follow = mutation({
  args: { userId: v.id("users") },
  returns: v.union(v.literal("pending"), v.literal("active")),
  handler: async (ctx, { userId }) => {
    const { userId: me } = await requireActiveUser(ctx);
    if (me === userId) throw new Error("You can't follow yourself.");
    const target = await ctx.db.get(userId);
    if (!target || target.deletedAt) throw new Error("That account doesn't exist.");
    if (await blockedEitherWay(ctx, me, userId)) {
      throw new Error("You can't follow this account.");
    }
    const existing = await followRow(ctx, me, userId);
    if (existing) return existing.status;
    const status = target.isPrivate === true ? "pending" : "active";
    await ctx.db.insert("follows", { followerId: me, followeeId: userId, status });
    if (status === "pending") {
      await notify(ctx, { userId, kind: "follow_request", actorId: me });
    } else if (await isActiveFollower(ctx, userId, me)) {
      await notify(ctx, { userId, kind: "now_friends", actorId: me });
      await notify(ctx, { userId: me, kind: "now_friends", actorId: userId });
    } else {
      await notify(ctx, { userId, kind: "new_follower", actorId: me });
    }
    return status;
  },
});

/** Unfollow, or cancel a pending request. */
export const unfollow = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const { userId: me } = await requireActiveUser(ctx);
    const existing = await followRow(ctx, me, userId);
    if (existing) await ctx.db.delete(existing._id);
    return null;
  },
});

/** Stop someone following you (or turn down their request). */
export const removeFollower = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const { userId: me } = await requireActiveUser(ctx);
    const existing = await followRow(ctx, userId, me);
    if (existing) await ctx.db.delete(existing._id);
    return null;
  },
});

export const approveFollower = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const { userId: me } = await requireActiveUser(ctx);
    const existing = await followRow(ctx, userId, me);
    if (!existing) throw new Error("That request was withdrawn.");
    if (existing.status === "pending") {
      await ctx.db.patch(existing._id, { status: "active" });
      if (await isActiveFollower(ctx, me, userId)) {
        await notify(ctx, { userId, kind: "now_friends", actorId: me });
        await notify(ctx, { userId: me, kind: "now_friends", actorId: userId });
      }
    }
    return null;
  },
});

export const setPrivate = mutation({
  args: { isPrivate: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { isPrivate }) => {
    const { userId } = await requireActiveUser(ctx);
    await ctx.db.patch(userId, { isPrivate });
    if (!isPrivate) {
      // Going public: everyone waiting is let in.
      const pending = await ctx.db
        .query("follows")
        .withIndex("by_followeeId_and_status", (q) =>
          q.eq("followeeId", userId).eq("status", "pending"),
        )
        .take(200);
      for (const row of pending) {
        await ctx.db.patch(row._id, { status: "active" });
      }
    }
    return null;
  },
});

export const getMyPrivacy = query({
  args: {},
  returns: v.union(v.null(), v.object({ isPrivate: v.boolean() })),
  handler: async (ctx) => {
    const userId = await optionalUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    return user ? { isPrivate: user.isPrivate === true } : null;
  },
});

/**
 * Summaries for a follow list. With `redactFor`, a private account that
 * viewer can't see comes back limited (name, college, year, role). Without it
 * the relationship already justifies the full summary (my friends, people
 * asking to follow me).
 */
async function publicUsers(
  ctx: Ctx,
  ids: Id<"users">[],
  redactFor?: { viewerId: Id<"users"> | null },
) {
  const out: ReturnType<typeof sanitizePublicUser>[] = [];
  for (const id of ids) {
    const user = await ctx.db.get(id);
    if (!user || user.deletedAt) continue;
    const limited =
      redactFor !== undefined &&
      !(await canSeeActivity(ctx, redactFor.viewerId, user));
    out.push(limited ? sanitizeLimitedUser(user) : sanitizePublicUser(user));
  }
  return out;
}

/**
 * Followers or following of `userId`. A private account's lists are only
 * visible to itself and its followers.
 */
export const listFollows = query({
  args: {
    userId: v.id("users"),
    direction: v.union(v.literal("followers"), v.literal("following")),
  },
  handler: async (ctx, { userId, direction }) => {
    const viewerId = await optionalUserId(ctx);
    const owner = await ctx.db.get(userId);
    if (!(await canSeeActivity(ctx, viewerId, owner))) return null;
    const rows =
      direction === "followers"
        ? await ctx.db
            .query("follows")
            .withIndex("by_followeeId_and_status", (q) =>
              q.eq("followeeId", userId).eq("status", "active"),
            )
            .order("desc")
            .take(200)
        : await ctx.db
            .query("follows")
            .withIndex("by_followerId_and_status", (q) =>
              q.eq("followerId", userId).eq("status", "active"),
            )
            .order("desc")
            .take(200);
    return await publicUsers(
      ctx,
      rows.map((r) => (direction === "followers" ? r.followerId : r.followeeId)),
      { viewerId },
    );
  },
});

/** People waiting for me to approve their follow. */
export const listFollowRequests = query({
  args: {},
  handler: async (ctx) => {
    const userId = await optionalUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("follows")
      .withIndex("by_followeeId_and_status", (q) =>
        q.eq("followeeId", userId).eq("status", "pending"),
      )
      .order("desc")
      .take(100);
    return await publicUsers(ctx, rows.map((r) => r.followerId));
  },
});

/** Everyone I follow who follows me back: who I can name in a group request. */
export const listMyFriends = query({
  args: {},
  handler: async (ctx) => {
    const userId = await optionalUserId(ctx);
    if (!userId) return [];
    const following = await ctx.db
      .query("follows")
      .withIndex("by_followerId_and_status", (q) =>
        q.eq("followerId", userId).eq("status", "active"),
      )
      .take(FOLLOW_LIST_LIMIT);
    const friends: Id<"users">[] = [];
    for (const row of following) {
      if (await isActiveFollower(ctx, row.followeeId, userId)) {
        friends.push(row.followeeId);
      }
    }
    return await publicUsers(ctx, friends);
  },
});

/**
 * Both follow each other, whatever their privacy settings: used when both
 * sides chose it (an invite link or a seat link). Pending rows are approved.
 */
export async function makeFriends(
  ctx: MutationCtx,
  a: Id<"users">,
  b: Id<"users">,
): Promise<void> {
  for (const [followerId, followeeId] of [
    [a, b],
    [b, a],
  ] as const) {
    const row = await followRow(ctx, followerId, followeeId);
    if (!row) {
      await ctx.db.insert("follows", { followerId, followeeId, status: "active" });
    } else if (row.status !== "active") {
      await ctx.db.patch(row._id, { status: "active" });
    }
  }
}
