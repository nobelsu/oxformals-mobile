import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { optionalUserId, requireActiveUser } from "./guards";

type Ctx = QueryCtx | MutationCtx;

/** Blocks read per direction when filtering lists. */
const BLOCK_SCAN = 500;

/** True when either person has blocked the other. */
export async function blockedEitherWay(
  ctx: Ctx,
  a: Id<"users">,
  b: Id<"users">,
): Promise<boolean> {
  for (const [blockerId, blockedId] of [
    [a, b],
    [b, a],
  ] as const) {
    const row = await ctx.db
      .query("blocks")
      .withIndex("by_blockerId_and_blockedId", (q) =>
        q.eq("blockerId", blockerId).eq("blockedId", blockedId),
      )
      .unique();
    if (row) return true;
  }
  return false;
}

/**
 * Everyone `userId` shouldn't see or be seen by: people they blocked and
 * people who blocked them. Empty for signed-out viewers.
 */
export async function blockedIdsFor(
  ctx: Ctx,
  userId: Id<"users"> | null,
): Promise<Set<Id<"users">>> {
  const ids = new Set<Id<"users">>();
  if (!userId) return ids;
  const mine = await ctx.db
    .query("blocks")
    .withIndex("by_blockerId_and_blockedId", (q) => q.eq("blockerId", userId))
    .take(BLOCK_SCAN);
  for (const row of mine) ids.add(row.blockedId);
  const theirs = await ctx.db
    .query("blocks")
    .withIndex("by_blockedId", (q) => q.eq("blockedId", userId))
    .take(BLOCK_SCAN);
  for (const row of theirs) ids.add(row.blockerId);
  return ids;
}

/**
 * Block someone: neither of you sees the other's listings, activity or
 * suggestions, and neither can follow, message or request the other. Any
 * follows between you are dropped. They aren't told.
 */
export const block = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const { userId: me } = await requireActiveUser(ctx);
    if (me === userId) throw new Error("You can't block yourself.");
    const existing = await ctx.db
      .query("blocks")
      .withIndex("by_blockerId_and_blockedId", (q) =>
        q.eq("blockerId", me).eq("blockedId", userId),
      )
      .unique();
    if (!existing) {
      await ctx.db.insert("blocks", { blockerId: me, blockedId: userId, createdAt: Date.now() });
    }
    for (const [followerId, followeeId] of [
      [me, userId],
      [userId, me],
    ] as const) {
      const follow = await ctx.db
        .query("follows")
        .withIndex("by_followerId_and_followeeId", (q) =>
          q.eq("followerId", followerId).eq("followeeId", followeeId),
        )
        .unique();
      if (follow) await ctx.db.delete(follow._id);
    }
    return null;
  },
});

export const unblock = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const { userId: me } = await requireActiveUser(ctx);
    const existing = await ctx.db
      .query("blocks")
      .withIndex("by_blockerId_and_blockedId", (q) =>
        q.eq("blockerId", me).eq("blockedId", userId),
      )
      .unique();
    if (existing) await ctx.db.delete(existing._id);
    return null;
  },
});

/** How a profile should treat the viewer: who blocked whom. */
export const getBlockState = query({
  args: { userId: v.id("users") },
  returns: v.object({ iBlocked: v.boolean(), blockedMe: v.boolean() }),
  handler: async (ctx, { userId }) => {
    const me = await optionalUserId(ctx);
    if (!me || me === userId) return { iBlocked: false, blockedMe: false };
    const row = async (blockerId: Id<"users">, blockedId: Id<"users">) =>
      (await ctx.db
        .query("blocks")
        .withIndex("by_blockerId_and_blockedId", (q) =>
          q.eq("blockerId", blockerId).eq("blockedId", blockedId),
        )
        .unique()) !== null;
    return { iBlocked: await row(me, userId), blockedMe: await row(userId, me) };
  },
});

/** People I've blocked, newest first, for Settings. */
export const listMyBlocks = query({
  args: {},
  returns: v.array(
    v.object({
      userId: v.id("users"),
      name: v.string(),
      college: v.union(v.string(), v.null()),
      blockedAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const me = await optionalUserId(ctx);
    if (!me) return [];
    const rows = await ctx.db
      .query("blocks")
      .withIndex("by_blockerId_and_blockedId", (q) => q.eq("blockerId", me))
      .take(BLOCK_SCAN);
    const out = [];
    for (const row of rows) {
      const user = await ctx.db.get(row.blockedId);
      out.push({
        userId: row.blockedId,
        name: user?.name ?? "Deleted account",
        college: user?.college ?? null,
        blockedAt: row.createdAt,
      });
    }
    return out.sort((a, b) => b.blockedAt - a.blockedAt);
  },
});
