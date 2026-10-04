import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { collectBadgeInputs } from "./badges";
import {
  hasRespondedToAttendance,
  recordAttendanceConfirmation,
} from "./formalAttendance";
import { canConfirmAttendanceCollegeListing } from "../lib/data/collegeReviewEligibility";
import {
  COLLEGE_BADGES,
  FOUNDING_BADGE_ID,
  MILESTONE_BADGES,
} from "../lib/data/badges";

/**
 * One-off backfill: stamp every existing listing that predates the
 * `formalType` field as a "social" formal. Safe to re-run — it only patches
 * rows that are still missing the field.
 *
 * Run with: `npx convex run migrations:backfillFormalTypeSocial`
 */
export const backfillFormalTypeSocial = internalMutation({
  args: {},
  handler: async (ctx) => {
    const listings = await ctx.db.query("listings").collect();
    let updated = 0;
    for (const listing of listings) {
      if (listing.formalType === undefined) {
        await ctx.db.patch(listing._id, { formalType: "social" });
        updated += 1;
      }
    }
    return { total: listings.length, updated };
  },
});

function milestoneEarnedAt(
  metricDatesAsc: number[],
  threshold: number,
): number | null {
  return metricDatesAsc.length >= threshold
    ? metricDatesAsc[threshold - 1]
    : null;
}

/**
 * All badges this user qualifies for, with historically derived earnedAt:
 * milestone dates come from the threshold-th piece of evidence; college
 * dates from the first attended confirmation at that college.
 */
function earnedBadgesWithDerivedDates(
  inputs: Awaited<ReturnType<typeof collectBadgeInputs>>,
): Array<{ badgeId: string; earnedAt: number }> {
  const earned: Array<{ badgeId: string; earnedAt: number }> = [];
  for (const badge of MILESTONE_BADGES) {
    const dates =
      badge.metric === "formals"
        ? inputs.attendedConfirmedAtsAsc
        : inputs.publicReviewUpdatedAtsAsc;
    const ts = milestoneEarnedAt(dates, badge.threshold);
    if (ts !== null) earned.push({ badgeId: badge.id, earnedAt: ts });
  }
  for (const badge of COLLEGE_BADGES) {
    const ts = inputs.collegeFirstAttendedAt.get(badge.college);
    if (ts !== undefined) earned.push({ badgeId: badge.id, earnedAt: ts });
  }
  return earned;
}

/**
 * One-off backfill: award every badge existing users already qualify for,
 * with derived earnedAt dates. Idempotent — held badges are never
 * re-inserted, so re-running awards nothing new. Batched via cursor
 * pagination: each invocation processes one page of users and continues
 * from the previous batch's cursor.
 *
 * Run with: npx convex run migrations:backfillUserBadges '{"paginationOpts":{"numItems":25,"cursor":null}}'
 */
export const backfillUserBadges = internalMutation({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.object({
    awarded: v.number(),
    scanned: v.number(),
    done: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Hard-cap the batch: each user can cost hundreds of document reads, and
    // an over-large batch would blow the transaction read limit and kill the
    // scheduled continuation.
    const pageSize = Math.min(args.paginationOpts.numItems, 25);
    const page = await ctx.db
      .query("users")
      .paginate({ ...args.paginationOpts, numItems: pageSize });
    let awarded = 0;
    for (const user of page.page) {
      const inputs = await collectBadgeInputs(ctx, user._id);
      const existing = await ctx.db
        .query("userBadges")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .take(100);
      const owned = new Set(existing.map((b) => b.badgeId));
      for (const earned of earnedBadgesWithDerivedDates(inputs)) {
        if (owned.has(earned.badgeId)) continue;
        await ctx.db.insert("userBadges", {
          userId: user._id,
          badgeId: earned.badgeId,
          earnedAt: earned.earnedAt,
        });
        awarded += 1;
      }
    }
    const done = page.isDone;
    if (!done) {
      await ctx.scheduler.runAfter(0, internal.migrations.backfillUserBadges, {
        paginationOpts: {
          numItems: pageSize,
          cursor: page.continueCursor,
        },
      });
    }
    return { awarded, scanned: page.page.length, done };
  },
});

/**
 * One-off: give the Starter (first-term) badge to everyone who signed up before
 * `signedUpBefore` (ms since epoch: the end of the first term). Skips deleted
 * accounts and anyone who already holds it, so re-running awards nothing new.
 * Stamped with the run time, so holders get the celebration on their next
 * visit. Batched like backfillUserBadges.
 *
 * Run with: npx convex run migrations:awardFoundingBadge '{"signedUpBefore":<ms>,"paginationOpts":{"numItems":100,"cursor":null}}'
 */
export const awardFoundingBadge = internalMutation({
  args: { signedUpBefore: v.number(), paginationOpts: paginationOptsValidator },
  returns: v.object({
    awarded: v.number(),
    scanned: v.number(),
    done: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const pageSize = Math.min(args.paginationOpts.numItems, 100);
    const page = await ctx.db
      .query("users")
      .paginate({ ...args.paginationOpts, numItems: pageSize });
    const now = Date.now();
    let awarded = 0;
    for (const user of page.page) {
      if (user._creationTime >= args.signedUpBefore) continue;
      if (user.deletedAt !== undefined) continue;
      const held = await ctx.db
        .query("userBadges")
        .withIndex("by_userId_and_badgeId", (q) =>
          q.eq("userId", user._id).eq("badgeId", FOUNDING_BADGE_ID),
        )
        .first();
      if (held) continue;
      await ctx.db.insert("userBadges", {
        userId: user._id,
        badgeId: FOUNDING_BADGE_ID,
        earnedAt: now,
      });
      awarded += 1;
    }
    const done = page.isDone;
    if (!done) {
      await ctx.scheduler.runAfter(0, internal.migrations.awardFoundingBadge, {
        signedUpBefore: args.signedUpBefore,
        paginationOpts: { numItems: pageSize, cursor: page.continueCursor },
      });
    }
    return { awarded, scanned: page.page.length, done };
  },
});

/** Formals this recent are left alone: guests may still answer "did you go?". */
const ATTENDANCE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * One-off: count the guests of past formals as having attended. Before
 * attendance was tracked (and for anyone who never answered "did you go?"),
 * a formal someone was a guest at left no record, so it doesn't show on their
 * profile or count towards badges.
 *
 * For every formal that ended more than a week ago, everyone in the group who
 * never answered gets an attendance record dated the night of the formal: the
 * host and people from that college too, except a host whose listing nobody
 * joined. Anyone who said they didn't go is left as they are. No
 * credits or referral rewards are paid. Re-running adds nothing new. When the
 * last page is done it re-runs backfillUserBadges, which dates the badges
 * historically so nobody gets a pile of celebration popups.
 *
 * Run with: npx convex run migrations:backfillAttendanceFromPastFormals '{"paginationOpts":{"numItems":25,"cursor":null}}'
 */
export const backfillAttendanceFromPastFormals = internalMutation({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.object({
    recorded: v.number(),
    scanned: v.number(),
    done: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const pageSize = Math.min(args.paginationOpts.numItems, 25);
    const page = await ctx.db
      .query("listings")
      .paginate({ ...args.paginationOpts, numItems: pageSize });
    const now = Date.now();
    let recorded = 0;
    for (const listing of page.page) {
      const night = Date.parse(listing.dateTime);
      if (Number.isNaN(night) || night > now - ATTENDANCE_GRACE_MS) continue;
      for (const memberId of listing.members) {
        const member = await ctx.db.get(memberId);
        if (!member || member.deletedAt !== undefined) continue;
        const eligible = canConfirmAttendanceCollegeListing(
          { id: memberId, college: member.college },
          {
            college: listing.college,
            dateTime: listing.dateTime,
            members: listing.members.map(String),
            ownerUserId: listing.ownerUserId,
          },
          now,
        );
        if (!eligible.canConfirm) continue;
        // A listing nobody joined is no evidence the host went.
        if (memberId === listing.ownerUserId && listing.members.length < 2) continue;
        if (await hasRespondedToAttendance(ctx, listing._id, memberId)) continue;
        await recordAttendanceConfirmation(ctx, listing, memberId, night);
        recorded += 1;
      }
    }
    const done = page.isDone;
    if (!done) {
      await ctx.scheduler.runAfter(0, internal.migrations.backfillAttendanceFromPastFormals, {
        paginationOpts: { numItems: pageSize, cursor: page.continueCursor },
      });
    } else {
      await ctx.scheduler.runAfter(0, internal.migrations.backfillUserBadges, {
        paginationOpts: { numItems: 25, cursor: null },
      });
    }
    return { recorded, scanned: page.page.length, done };
  },
});
