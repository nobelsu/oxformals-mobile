import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  applyAttendanceGuestDelta,
  applyFormalCompleted,
  applyReviewInsert,
  applyReviewUpdate,
  averagesFromSums,
  EMPTY_COLLEGE_STATS,
  EMPTY_RATING_SUMS,
} from "../lib/data/collegeStats";
import { guestCountForListing } from "../lib/data/collegeAttendance";
import { listingIsPast } from "./listingHelpers";
import { normalizeCollegeName, OXFORD_COLLEGES } from "../lib/data/colleges";
import type { ReviewRatings } from "./collegeReviewHelpers";
import {
  buildLeaderboardEntries,
  leaderboardRankForCollege,
  statsToLeaderboardInput,
  type LeaderboardCollegeInput,
} from "../lib/data/collegeReviews";

const BACKFILL_REVIEW_BATCH = 100;
const BACKFILL_LISTING_BATCH = 100;

export async function getOrCreateCollegeStatsDoc(
  ctx: MutationCtx,
  college: string,
  nowMs: number,
): Promise<Doc<"collegeStats">> {
  const normalized = normalizeCollegeName(college);
  const existing = await ctx.db
    .query("collegeStats")
    .withIndex("by_college", (q) => q.eq("college", normalized))
    .unique();

  if (existing) return existing;

  const id = await ctx.db.insert("collegeStats", {
    college: normalized,
    ...EMPTY_COLLEGE_STATS,
    updatedAt: nowMs,
  });
  const doc = await ctx.db.get(id);
  if (!doc) throw new Error("Failed to create college stats.");
  return doc;
}

export async function recordReviewInsert(
  ctx: MutationCtx,
  college: string,
  ratings: ReviewRatings,
  nowMs: number,
): Promise<void> {
  const doc = await getOrCreateCollegeStatsDoc(ctx, college, nowMs);
  const next = applyReviewInsert(
    {
      reviewCount: doc.reviewCount,
      ratingSums: doc.ratingSums,
      attendanceCount: doc.attendanceCount,
      completedFormalCount: doc.completedFormalCount,
    },
    ratings,
  );
  await ctx.db.patch(doc._id, { ...next, updatedAt: nowMs });
}

export async function recordReviewUpdate(
  ctx: MutationCtx,
  college: string,
  oldRatings: ReviewRatings,
  newRatings: ReviewRatings,
  nowMs: number,
): Promise<void> {
  const doc = await getOrCreateCollegeStatsDoc(ctx, college, nowMs);
  const next = applyReviewUpdate(
    {
      reviewCount: doc.reviewCount,
      ratingSums: doc.ratingSums,
      attendanceCount: doc.attendanceCount,
      completedFormalCount: doc.completedFormalCount,
    },
    oldRatings,
    newRatings,
  );
  await ctx.db.patch(doc._id, { ...next, updatedAt: nowMs });
}

function guestCountForDoc(listing: Doc<"listings">): number {
  return guestCountForListing({
    college: listing.college,
    dateTime: listing.dateTime,
    ownerUserId: listing.ownerUserId,
    members: listing.members.map(String),
  });
}

export async function applyCompletedFormalForListing(
  ctx: MutationCtx,
  listingId: Id<"listings">,
  nowMs: number,
): Promise<void> {
  const listing = await ctx.db.get(listingId);
  if (!listing) return;
  if (listing.attendanceAppliedAt !== undefined) return;
  if (!listingIsPast(listing.dateTime, nowMs)) return;

  const college = normalizeCollegeName(listing.college);
  if (!college) return;

  const guests = guestCountForDoc(listing);
  const doc = await getOrCreateCollegeStatsDoc(ctx, college, nowMs);
  const next = applyFormalCompleted(
    {
      reviewCount: doc.reviewCount,
      ratingSums: doc.ratingSums,
      attendanceCount: doc.attendanceCount,
      completedFormalCount: doc.completedFormalCount,
    },
    guests,
  );
  await ctx.db.patch(doc._id, { ...next, updatedAt: nowMs });
  await ctx.db.patch(listingId, {
    attendanceAppliedAt: nowMs,
    attendanceGuestCount: guests,
  });
}

export async function syncListingAttendanceGuests(
  ctx: MutationCtx,
  listing: Doc<"listings">,
  nowMs: number,
): Promise<void> {
  if (listing.attendanceAppliedAt === undefined) return;

  const college = normalizeCollegeName(listing.college);
  if (!college) return;

  const newGuests = guestCountForDoc(listing);
  const prevGuests = listing.attendanceGuestCount ?? 0;
  const delta = newGuests - prevGuests;
  if (delta === 0) return;

  const doc = await getOrCreateCollegeStatsDoc(ctx, college, nowMs);
  const next = applyAttendanceGuestDelta(
    {
      reviewCount: doc.reviewCount,
      ratingSums: doc.ratingSums,
      attendanceCount: doc.attendanceCount,
      completedFormalCount: doc.completedFormalCount,
    },
    delta,
  );
  await ctx.db.patch(doc._id, { ...next, updatedAt: nowMs });
  await ctx.db.patch(listing._id, { attendanceGuestCount: newGuests });
}

export async function scheduleFormalCompletion(
  ctx: MutationCtx,
  listingId: Id<"listings">,
  dateTime: string,
): Promise<void> {
  const timestamp = Date.parse(dateTime);
  if (Number.isNaN(timestamp)) return;
  const delay = Math.max(0, timestamp - Date.now());
  await ctx.scheduler.runAfter(
    delay,
    internal.collegeStats.applyCompletedFormal,
    { listingId },
  );
}

export async function loadLeaderboardInputsFromStats(
  ctx: MutationCtx | QueryCtx,
): Promise<Map<string, LeaderboardCollegeInput>> {
  const rows = await ctx.db.query("collegeStats").collect();
  const byCollege = new Map<string, LeaderboardCollegeInput>();
  for (const row of rows) {
    byCollege.set(
      row.college,
      statsToLeaderboardInput({
        reviewCount: row.reviewCount,
        ratingSums: row.ratingSums,
        attendanceCount: row.attendanceCount,
        completedFormalCount: row.completedFormalCount,
      }),
    );
  }
  for (const college of OXFORD_COLLEGES) {
    if (!byCollege.has(college)) {
      byCollege.set(college, statsToLeaderboardInput(EMPTY_COLLEGE_STATS));
    }
  }
  return byCollege;
}

export async function getCollegeAggregatesFromStats(
  ctx: MutationCtx | QueryCtx,
  college: string,
) {
  const normalized = normalizeCollegeName(college);
  const row = await ctx.db
    .query("collegeStats")
    .withIndex("by_college", (q) => q.eq("college", normalized))
    .unique();

  const snapshot = row
    ? {
        reviewCount: row.reviewCount,
        ratingSums: row.ratingSums,
        attendanceCount: row.attendanceCount,
        completedFormalCount: row.completedFormalCount,
      }
    : EMPTY_COLLEGE_STATS;

  const dataByCollege = await loadLeaderboardInputsFromStats(ctx);
  const leaderboard = buildLeaderboardEntries(
    OXFORD_COLLEGES,
    dataByCollege,
    "overall",
  );

  return {
    college: normalized,
    reviewCount: snapshot.reviewCount,
    averages: averagesFromSums(snapshot.ratingSums, snapshot.reviewCount),
    attendanceCount: snapshot.attendanceCount,
    completedFormalCount: snapshot.completedFormalCount,
    rank: leaderboardRankForCollege(leaderboard, normalized),
  };
}

export const applyCompletedFormal = internalMutation({
  args: { listingId: v.id("listings") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await applyCompletedFormalForListing(ctx, args.listingId, Date.now());
    return null;
  },
});

export const backfill = internalMutation({
  args: {
    reviewCursor: v.optional(v.string()),
    listingCursor: v.optional(v.string()),
    phase: v.optional(v.union(v.literal("reviews"), v.literal("listings"))),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const nowMs = Date.now();
    const phase = args.phase ?? "reviews";

    if (phase === "reviews" && args.reviewCursor === undefined) {
      const existing = await ctx.db.query("collegeStats").collect();
      for (const row of existing) {
        await ctx.db.delete(row._id);
      }
      for (const college of OXFORD_COLLEGES) {
        await ctx.db.insert("collegeStats", {
          college,
          reviewCount: 0,
          ratingSums: { ...EMPTY_RATING_SUMS },
          attendanceCount: 0,
          completedFormalCount: 0,
          updatedAt: nowMs,
        });
      }
    }

    if (phase === "reviews") {
      const batch = await ctx.db
        .query("collegeReviews")
        .paginate({ numItems: BACKFILL_REVIEW_BATCH, cursor: args.reviewCursor ?? null });

      for (const review of batch.page) {
        const college = normalizeCollegeName(review.college);
        const doc = await getOrCreateCollegeStatsDoc(ctx, college, nowMs);
        const next = applyReviewInsert(
          {
            reviewCount: doc.reviewCount,
            ratingSums: doc.ratingSums,
            attendanceCount: doc.attendanceCount,
            completedFormalCount: doc.completedFormalCount,
          },
          review.ratings,
        );
        await ctx.db.patch(doc._id, { ...next, updatedAt: nowMs });
      }

      if (!batch.isDone) {
        await ctx.scheduler.runAfter(0, internal.collegeStats.backfill, {
          reviewCursor: batch.continueCursor,
          phase: "reviews",
        });
        return null;
      }

      await ctx.scheduler.runAfter(0, internal.collegeStats.backfill, {
        phase: "listings",
      });
      return null;
    }

    const listingBatch = await ctx.db
      .query("listings")
      .paginate({ numItems: BACKFILL_LISTING_BATCH, cursor: args.listingCursor ?? null });

    for (const listing of listingBatch.page) {
      if (!listingIsPast(listing.dateTime, nowMs)) continue;
      if (listing.attendanceAppliedAt !== undefined) continue;

      const college = normalizeCollegeName(listing.college);
      if (!college) continue;

      const guests = guestCountForDoc(listing);
      const doc = await getOrCreateCollegeStatsDoc(ctx, college, nowMs);
      const next = applyFormalCompleted(
        {
          reviewCount: doc.reviewCount,
          ratingSums: doc.ratingSums,
          attendanceCount: doc.attendanceCount,
          completedFormalCount: doc.completedFormalCount,
        },
        guests,
      );
      await ctx.db.patch(doc._id, { ...next, updatedAt: nowMs });
      await ctx.db.patch(listing._id, {
        attendanceAppliedAt: nowMs,
        attendanceGuestCount: guests,
      });
    }

    if (!listingBatch.isDone) {
      await ctx.scheduler.runAfter(0, internal.collegeStats.backfill, {
        listingCursor: listingBatch.continueCursor,
        phase: "listings",
      });
    }

    return null;
  },
});
