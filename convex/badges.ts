import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { optionalUserId, requireUserId } from "./guards";
import { canSeeActivity } from "./follows";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { normalizeCollegeName } from "../lib/data/colleges";
import { rowCountsAsAttended } from "../lib/data/formalAttendance";
import {
  COLLEGE_BADGES,
  MILESTONE_BADGES,
} from "../lib/data/badges";

export type BadgeInputs = {
  attendedCount: number;
  /** `confirmedAt` of every attended confirmation, ascending. */
  attendedConfirmedAtsAsc: number[];
  /** Normalized college → earliest attended confirmation time. */
  collegeFirstAttendedAt: Map<string, number>;
  publicReviewCount: number;
  /** `updatedAt` of every public review, ascending. */
  publicReviewUpdatedAtsAsc: number[];
};

/**
 * Single reader over the evidence tables. Bounded to 200 rows per table —
 * the same cap convention used across this codebase (users.ts, etc.).
 */
export async function collectBadgeInputs(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
): Promise<BadgeInputs> {
  const attendanceRows = await ctx.db
    .query("formalAttendanceConfirmations")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .take(200);
  const attendedRows = attendanceRows.filter(rowCountsAsAttended);

  const collegeFirstAttendedAt = new Map<string, number>();
  for (const row of attendedRows) {
    const listing = await ctx.db.get(row.listingId);
    if (!listing) continue;
    const college = normalizeCollegeName(listing.college);
    if (!college) continue;
    const prev = collegeFirstAttendedAt.get(college);
    if (prev === undefined || row.confirmedAt < prev) {
      collegeFirstAttendedAt.set(college, row.confirmedAt);
    }
  }

  const reviewRows = await ctx.db
    .query("collegeReviews")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .take(200);
  const publicReviewRows = reviewRows.filter((r) => !r.isAnonymous);

  return {
    attendedCount: attendedRows.length,
    attendedConfirmedAtsAsc: attendedRows
      .map((r) => r.confirmedAt)
      .sort((a, b) => a - b),
    collegeFirstAttendedAt,
    publicReviewCount: publicReviewRows.length,
    publicReviewUpdatedAtsAsc: publicReviewRows
      .map((r) => r.updatedAt)
      .sort((a, b) => a - b),
  };
}

/**
 * Idempotently insert every badge the user now qualifies for but doesn't
 * hold. Live awards are stamped with `nowMs` (not backdated — backfill
 * derives historical dates instead). Returns the number of rows inserted.
 */
export async function awardNewBadges(
  ctx: MutationCtx,
  userId: Id<"users">,
  nowMs: number,
): Promise<number> {
  const inputs = await collectBadgeInputs(ctx, userId);
  const existing = await ctx.db
    .query("userBadges")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .take(100);
  const owned = new Set(existing.map((b) => b.badgeId));

  let inserted = 0;
  for (const badge of MILESTONE_BADGES) {
    const count =
      badge.metric === "formals"
        ? inputs.attendedCount
        : inputs.publicReviewCount;
    if (count >= badge.threshold && !owned.has(badge.id)) {
      await ctx.db.insert("userBadges", {
        userId,
        badgeId: badge.id,
        earnedAt: nowMs,
      });
      inserted += 1;
    }
  }
  for (const badge of COLLEGE_BADGES) {
    if (inputs.collegeFirstAttendedAt.has(badge.college) && !owned.has(badge.id)) {
      await ctx.db.insert("userBadges", {
        userId,
        badgeId: badge.id,
        earnedAt: nowMs,
      });
      inserted += 1;
    }
  }
  return inserted;
}

/** Earned badge rows for a profile's badge row + badge case modal. */
export const getUserBadges = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const owner = await ctx.db.get(args.userId);
    if (!(await canSeeActivity(ctx, await optionalUserId(ctx), owner))) return [];
    return await ctx.db
      .query("userBadges")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .take(100);
  },
});

/** Counts behind the milestone ladders in the badge case. */
export const getBadgeProgress = query({
  args: { userId: v.id("users") },
  returns: v.object({ formals: v.number(), reviews: v.number() }),
  handler: async (ctx, { userId }) => {
    const owner = await ctx.db.get(userId);
    if (!(await canSeeActivity(ctx, await optionalUserId(ctx), owner))) {
      return { formals: 0, reviews: 0 };
    }
    const inputs = await collectBadgeInputs(ctx, userId);
    return {
      formals: inputs.attendedCount,
      reviews: inputs.publicReviewCount,
    };
  },
});

/**
 * Badges the signed-in user earned since they last saw one, oldest first.
 * `needsBaseline` means they have never had a baseline set: the client sets
 * one to "now" so existing badges aren't celebrated all at once.
 */
export const getMyNewBadges = query({
  args: {},
  returns: v.object({
    needsBaseline: v.boolean(),
    badges: v.array(v.object({ badgeId: v.string(), earnedAt: v.number() })),
  }),
  handler: async (ctx) => {
    const userId = await optionalUserId(ctx);
    if (!userId) return { needsBaseline: false, badges: [] };
    const user = await ctx.db.get(userId);
    if (!user || user.deletedAt !== undefined) {
      return { needsBaseline: false, badges: [] };
    }
    if (user.badgesSeenAt === undefined) {
      return { needsBaseline: true, badges: [] };
    }
    const seenAt = user.badgesSeenAt;
    const rows = await ctx.db
      .query("userBadges")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(100);
    return {
      needsBaseline: false,
      badges: rows
        .filter((r) => r.earnedAt > seenAt)
        .sort((a, b) => a.earnedAt - b.earnedAt)
        .map((r) => ({ badgeId: r.badgeId, earnedAt: r.earnedAt })),
    };
  },
});

/** Move the "seen" line forward (never back). */
export const markBadgesSeen = mutation({
  args: { upTo: v.number() },
  returns: v.null(),
  handler: async (ctx, { upTo }) => {
    const userId = await requireUserId(ctx);
    const user = await ctx.db.get(userId);
    if (!user) return null;
    if (user.badgesSeenAt === undefined || upTo > user.badgesSeenAt) {
      await ctx.db.patch(userId, { badgesSeenAt: upTo });
    }
    return null;
  },
});
