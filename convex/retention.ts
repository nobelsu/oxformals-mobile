import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { recordReviewDelete } from "./collegeStats";

/**
 * Retention limits promised in the privacy policy ("What happens when you
 * delete your account"). Run daily; each stage deletes in batches and
 * reschedules itself while more is due.
 *
 * - Messages a deleted user sent: 12 months after they deleted.
 * - College reviews by a deleted user (and the votes, reports, comments,
 *   likes and bookmarks on them): 24 months after they deleted. College
 *   stats are updated as if the review was never written.
 * - Paid or refunded credit holds involving a deleted user: 2 years after the
 *   formal (or after the hold was settled, if later). Balances live in
 *   `creditAccounts`; settled holds are history nothing else reads.
 * - Swap-break records: 12 months after they were recorded.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
export const MESSAGES_AFTER_DELETION_MS = 365 * DAY_MS;
export const REVIEWS_AFTER_DELETION_MS = 2 * 365 * DAY_MS;
export const CREDIT_HOLDS_MS = 2 * 365 * DAY_MS;
export const SWAP_BREAKS_MS = 365 * DAY_MS;

/** Documents deleted per invocation. */
const DELETE_BATCH = 200;
/** Credit holds looked at per invocation. */
const HOLD_PAGE = 200;

export const runDaily = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    await ctx.scheduler.runAfter(0, internal.retention.purgeDeletedUsersMessages, { now });
    await ctx.scheduler.runAfter(0, internal.retention.purgeDeletedUsersReviews, { now });
    await ctx.scheduler.runAfter(0, internal.retention.purgeSettledCreditHolds, {
      now,
      status: "paid",
    });
    await ctx.scheduler.runAfter(0, internal.retention.purgeSettledCreditHolds, {
      now,
      status: "refunded",
    });
    await ctx.scheduler.runAfter(0, internal.retention.purgeOldSwapBreaks, { now });
    return null;
  },
});

/** Deleted users looked at per invocation. */
const USER_PAGE = 50;

/**
 * Walk one page of users deleted at or before `cutoff`, calling `purge` with
 * the remaining delete budget; `purge` returns how many documents it deleted,
 * or `null` if it ran out of budget before finishing that user. Returns the
 * cursor to continue from (the same page again if the budget ran out), or
 * null when there's nothing left.
 */
async function forEachDeletedUser(
  ctx: MutationCtx,
  cutoff: number,
  cursor: string | null,
  purge: (user: Doc<"users">, budget: number) => Promise<number | null>,
): Promise<{ cursor: string | null } | null> {
  const page = await ctx.db
    .query("users")
    .withIndex("by_deletedAt", (q) =>
      q.gte("deletedAt", 0).lte("deletedAt", cutoff),
    )
    .paginate({ numItems: USER_PAGE, cursor });
  let budget = DELETE_BATCH;
  for (const user of page.page) {
    const deleted = await purge(user, budget);
    if (deleted === null) return { cursor };
    budget -= deleted;
  }
  return page.isDone ? null : { cursor: page.continueCursor };
}

export const purgeDeletedUsersMessages = internalMutation({
  args: { now: v.number(), cursor: v.optional(v.union(v.string(), v.null())) },
  returns: v.null(),
  handler: async (ctx, { now, cursor }) => {
    const resume = await forEachDeletedUser(
      ctx,
      now - MESSAGES_AFTER_DELETION_MS,
      cursor ?? null,
      async (user, budget) => {
        const rows = await ctx.db
          .query("messages")
          .withIndex("by_senderUserId", (q) => q.eq("senderUserId", user._id))
          .take(budget + 1);
        const batch = rows.slice(0, budget);
        for (const row of batch) await ctx.db.delete(row._id);
        return rows.length > budget ? null : batch.length;
      },
    );
    if (resume !== null) {
      await ctx.scheduler.runAfter(0, internal.retention.purgeDeletedUsersMessages, {
        now,
        cursor: resume.cursor,
      });
    }
    return null;
  },
});

/**
 * Delete one review and everything hanging off it, within `budget` deletes.
 * Returns deletes used, or null if the budget ran out first (call again).
 */
async function deleteReviewCompletely(
  ctx: MutationCtx,
  review: Doc<"collegeReviews">,
  budget: number,
  now: number,
): Promise<number | null> {
  let used = 0;
  const drain = async (ids: Id<
    "collegeReviewVotes" | "collegeReviewReports" | "feedComments" | "feedLikes" | "feedBookmarks"
  >[]) => {
    for (const id of ids) {
      if (used >= budget) return false;
      await ctx.db.delete(id);
      used++;
    }
    return true;
  };
  const key = `review:${review._id}`;
  const take = () => budget - used + 1;
  const children = [
    async () =>
      (
        await ctx.db
          .query("collegeReviewVotes")
          .withIndex("by_reviewId", (q) => q.eq("reviewId", review._id))
          .take(take())
      ).map((r) => r._id),
    async () =>
      (
        await ctx.db
          .query("collegeReviewReports")
          .withIndex("by_reviewId", (q) => q.eq("reviewId", review._id))
          .take(take())
      ).map((r) => r._id),
    async () =>
      (
        await ctx.db
          .query("feedComments")
          .withIndex("by_targetKey", (q) => q.eq("targetKey", key))
          .take(take())
      ).map((r) => r._id),
    async () =>
      (
        await ctx.db
          .query("feedLikes")
          .withIndex("by_targetKey", (q) => q.eq("targetKey", key))
          .take(take())
      ).map((r) => r._id),
    async () =>
      (
        await ctx.db
          .query("feedBookmarks")
          .withIndex("by_targetKey_and_userId", (q) => q.eq("targetKey", key))
          .take(take())
      ).map((r) => r._id),
  ];
  for (const load of children) {
    if (!(await drain(await load()))) return null;
  }
  if (used >= budget) return null;

  // Photos are normally already gone (purged at deletion); belt and braces.
  for (const imageId of review.imageIds ?? []) {
    if (await ctx.db.system.get("_storage", imageId)) {
      await ctx.storage.delete(imageId);
    }
  }
  await recordReviewDelete(ctx, review.college, review.ratings, now);
  await ctx.db.delete(review._id);
  return used + 1;
}

export const purgeDeletedUsersReviews = internalMutation({
  args: { now: v.number(), cursor: v.optional(v.union(v.string(), v.null())) },
  returns: v.null(),
  handler: async (ctx, { now, cursor }) => {
    const resume = await forEachDeletedUser(
      ctx,
      now - REVIEWS_AFTER_DELETION_MS,
      cursor ?? null,
      async (user, budget) => {
        const reviews = await ctx.db
          .query("collegeReviews")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .take(budget + 1);
        let used = 0;
        for (const review of reviews) {
          if (used >= budget) return null;
          const spent = await deleteReviewCompletely(ctx, review, budget - used, now);
          if (spent === null) return null;
          used += spent;
        }
        return used;
      },
    );
    if (resume !== null) {
      await ctx.scheduler.runAfter(0, internal.retention.purgeDeletedUsersReviews, {
        now,
        cursor: resume.cursor,
      });
    }
    return null;
  },
});

export const purgeSettledCreditHolds = internalMutation({
  args: {
    now: v.number(),
    status: v.union(v.literal("paid"), v.literal("refunded")),
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, { now, status, cursor }) => {
    const cutoff = now - CREDIT_HOLDS_MS;
    const deletedCache = new Map<Id<"users">, boolean>();
    const isDeleted = async (id: Id<"users">) => {
      const hit = deletedCache.get(id);
      if (hit !== undefined) return hit;
      const user = await ctx.db.get(id);
      const deleted = user?.deletedAt !== undefined;
      deletedCache.set(id, deleted);
      return deleted;
    };

    // `releaseAt` is 24h after the formal, when a hold is normally paid.
    const page = await ctx.db
      .query("creditHolds")
      .withIndex("by_status_and_releaseAt", (q) =>
        q.eq("status", status).lte("releaseAt", cutoff),
      )
      .paginate({ numItems: HOLD_PAGE, cursor: cursor ?? null });
    for (const hold of page.page) {
      // Settled after the formal (a late dispute): count from settlement.
      if ((hold.resolvedAt ?? 0) > cutoff) continue;
      if (
        (await isDeleted(hold.payerId)) ||
        (await isDeleted(hold.hostId)) ||
        (await isDeleted(hold.seatHolderId))
      ) {
        await ctx.db.delete(hold._id);
      }
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.retention.purgeSettledCreditHolds, {
        now,
        status,
        cursor: page.continueCursor,
      });
    }
    return null;
  },
});

export const purgeOldSwapBreaks = internalMutation({
  args: { now: v.number() },
  returns: v.null(),
  handler: async (ctx, { now }) => {
    const rows = await ctx.db
      .query("swapBreaks")
      .withIndex("by_createdAt", (q) => q.lte("createdAt", now - SWAP_BREAKS_MS))
      .take(DELETE_BATCH);
    for (const row of rows) await ctx.db.delete(row._id);
    if (rows.length === DELETE_BATCH) {
      await ctx.scheduler.runAfter(0, internal.retention.purgeOldSwapBreaks, { now });
    }
    return null;
  },
});
