import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import {
  hasConfirmedAttendance,
  hasDeclinedAttendance,
  hasRespondedToAttendance,
} from "./formalAttendance";
import {
  deleteReviewImagesIfPresent,
  getConfirmAttendanceEligibility,
  getReviewEligibility,
  MAX_REVIEW_COMMENT_LENGTH,
  normalizeRatings,
  reviewImageIdsRemoved,
  validateReviewImageIds,
} from "./collegeReviewHelpers";
import {
  getCollegeAggregatesFromStats,
  loadLeaderboardInputsFromStats,
  recordReviewInsert,
  recordReviewUpdate,
} from "./collegeStats";
import { normalizeCollegeName, OXFORD_COLLEGES } from "../lib/data/colleges";
import {
  buildLeaderboardEntries,
  sortCollegeReviewRows,
  type CollegeReviewCategory,
} from "../lib/data/collegeReviews";
import { optionalUserId, requireActiveUser } from "./guards";

const ratingsValidator = v.object({
  food: v.number(),
  atmosphere: v.number(),
  value: v.number(),
  overall: v.number(),
});

const categoryValidator = v.union(
  v.literal("overall"),
  v.literal("food"),
  v.literal("atmosphere"),
  v.literal("value"),
);

const sortValidator = v.union(v.literal("recent"), v.literal("top"));

const publicReviewValidator = v.object({
  id: v.id("collegeReviews"),
  listingId: v.id("listings"),
  college: v.string(),
  ratings: ratingsValidator,
  comment: v.optional(v.string()),
  isAnonymous: v.boolean(),
  author: v.union(
    v.null(),
    v.object({
      userId: v.id("users"),
      name: v.string(),
      college: v.string(),
      year: v.string(),
    }),
  ),
  formalDateTime: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
  voteScore: v.number(),
  viewerVote: v.union(v.null(), v.literal(1), v.literal(-1)),
  imageIds: v.optional(v.array(v.id("_storage"))),
  imageUrls: v.array(v.string()),
});

const aggregatesValidator = v.object({
  college: v.string(),
  reviewCount: v.number(),
  averages: v.union(v.null(), ratingsValidator),
  attendanceCount: v.number(),
  completedFormalCount: v.number(),
  rank: v.union(v.null(), v.number()),
});

const leaderboardEntryValidator = v.object({
  college: v.string(),
  reviewCount: v.number(),
  average: v.union(v.null(), v.number()),
  rank: v.union(v.null(), v.number()),
  attendanceCount: v.number(),
  completedFormalCount: v.number(),
});

async function enrichReview(
  ctx: QueryCtx,
  review: Doc<"collegeReviews">,
  viewerId: Id<"users"> | null,
) {
  const listing = await ctx.db.get(review.listingId);
  const authorUser = await ctx.db.get(review.userId);
  const showAuthor =
    !review.isAnonymous || (viewerId !== null && viewerId === review.userId);

  let viewerVote: 1 | -1 | null = null;
  if (viewerId) {
    const vote = await ctx.db
      .query("collegeReviewVotes")
      .withIndex("by_reviewId_and_userId", (q) =>
        q.eq("reviewId", review._id).eq("userId", viewerId),
      )
      .unique();
    viewerVote = vote?.value ?? null;
  }

  const imageIds = review.imageIds;
  const imageUrls: string[] = [];
  if (imageIds) {
    for (const imageId of imageIds) {
      const url = await ctx.storage.getUrl(imageId);
      if (url) imageUrls.push(url);
    }
  }

  return {
    id: review._id,
    listingId: review.listingId,
    college: review.college,
    ratings: normalizeRatings(review.ratings),
    comment: review.comment,
    imageIds,
    imageUrls,
    isAnonymous: review.isAnonymous,
    author:
      showAuthor && authorUser
        ? {
            userId: authorUser._id,
            name: authorUser.name ?? "Oxford student",
            college: authorUser.college ?? "",
            year: authorUser.year ?? "",
          }
        : null,
    formalDateTime: listing?.dateTime ?? "",
    createdAt: review._creationTime,
    updatedAt: review.updatedAt,
    voteScore: review.voteScore ?? 0,
    viewerVote,
  };
}

export const getReviewForListing = query({
  args: {
    listingId: v.id("listings"),
  },
  returns: v.union(v.null(), publicReviewValidator),
  handler: async (ctx, args) => {
    const userId = await optionalUserId(ctx);
    if (!userId) return null;
    const review = await ctx.db
      .query("collegeReviews")
      .withIndex("by_listingId_and_userId", (q) =>
        q.eq("listingId", args.listingId).eq("userId", userId),
      )
      .unique();
    if (!review) return null;
    return await enrichReview(ctx, review, userId);
  },
});

export const getListingReviewState = query({
  args: {
    listingId: v.id("listings"),
    nowMs: v.number(),
  },
  returns: v.object({
    isPast: v.boolean(),
    canReview: v.boolean(),
    canConfirmAttendance: v.boolean(),
    hasConfirmedAttendance: v.boolean(),
    hasRespondedToAttendance: v.boolean(),
    hasDeclinedAttendance: v.boolean(),
    reason: v.optional(v.string()),
    existingReview: v.union(v.null(), publicReviewValidator),
  }),
  handler: async (ctx, args) => {
    const userId = await optionalUserId(ctx);
    const listing = await ctx.db.get(args.listingId);
    if (!listing) {
      return {
        isPast: false,
        canReview: false,
        canConfirmAttendance: false,
        hasConfirmedAttendance: false,
        hasRespondedToAttendance: false,
        hasDeclinedAttendance: false,
        reason: "Listing not found.",
        existingReview: null,
      };
    }

    let existingReview = null;
    let confirmed = false;
    let responded = false;
    let declined = false;
    if (userId) {
      const row = await ctx.db
        .query("collegeReviews")
        .withIndex("by_listingId_and_userId", (q) =>
          q.eq("listingId", args.listingId).eq("userId", userId),
        )
        .unique();
      if (row) {
        existingReview = await enrichReview(ctx, row, userId);
      }
      responded = await hasRespondedToAttendance(ctx, args.listingId, userId);
      confirmed = await hasConfirmedAttendance(ctx, args.listingId, userId);
      declined = await hasDeclinedAttendance(ctx, args.listingId, userId);
    }

    const user = userId ? await ctx.db.get(userId) : null;
    const eligibility = getReviewEligibility(user, listing, userId, args.nowMs, {
      hasExistingReview: existingReview !== null,
      hasConfirmedAttendance: confirmed,
    });
    const confirmEligibility = getConfirmAttendanceEligibility(
      user,
      listing,
      userId,
      args.nowMs,
      responded,
    );

    return {
      isPast: eligibility.isPast,
      canReview: eligibility.canReview,
      canConfirmAttendance: confirmEligibility.canConfirm,
      hasConfirmedAttendance: confirmed,
      hasRespondedToAttendance: responded,
      hasDeclinedAttendance: declined,
      reason: eligibility.canReview
        ? eligibility.reason
        : confirmEligibility.canConfirm
          ? confirmEligibility.reason
          : eligibility.reason ?? confirmEligibility.reason,
      existingReview,
    };
  },
});

export const submitReview = mutation({
  args: {
    listingId: v.id("listings"),
    nowMs: v.number(),
    ratings: ratingsValidator,
    comment: v.optional(v.string()),
    imageIds: v.optional(v.array(v.id("_storage"))),
    isAnonymous: v.boolean(),
  },
  returns: v.id("collegeReviews"),
  handler: async (ctx, args) => {
    const { userId, user } = await requireActiveUser(ctx);
    const listing = await ctx.db.get(args.listingId);
    if (!listing) throw new Error("Listing not found.");

    const existing = await ctx.db
      .query("collegeReviews")
      .withIndex("by_listingId_and_userId", (q) =>
        q.eq("listingId", args.listingId).eq("userId", userId),
      )
      .unique();
    if (existing) throw new Error("You already reviewed this formal.");

    const confirmed = await hasConfirmedAttendance(ctx, args.listingId, userId);
    const eligibility = getReviewEligibility(user, listing, userId, args.nowMs, {
      hasExistingReview: false,
      hasConfirmedAttendance: confirmed,
    });
    if (!eligibility.canReview) {
      throw new Error(eligibility.reason ?? "You cannot review this formal.");
    }

    const comment = args.comment?.trim();
    if (comment && comment.length > MAX_REVIEW_COMMENT_LENGTH) {
      throw new Error(`Comment must be at most ${MAX_REVIEW_COMMENT_LENGTH} characters.`);
    }

    const college = normalizeCollegeName(listing.college);
    const ratings = normalizeRatings(args.ratings);
    const imageIds = await validateReviewImageIds(ctx, args.imageIds, userId);
    const reviewId = await ctx.db.insert("collegeReviews", {
      userId,
      listingId: args.listingId,
      college,
      ratings,
      comment: comment || undefined,
      ...(imageIds ? { imageIds } : {}),
      isAnonymous: args.isAnonymous,
      updatedAt: args.nowMs,
    });
    await recordReviewInsert(ctx, college, ratings, args.nowMs);
    return reviewId;
  },
});

export const updateReview = mutation({
  args: {
    reviewId: v.id("collegeReviews"),
    nowMs: v.number(),
    ratings: ratingsValidator,
    comment: v.optional(v.string()),
    imageIds: v.optional(v.array(v.id("_storage"))),
    isAnonymous: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId } = await requireActiveUser(ctx);
    const review = await ctx.db.get(args.reviewId);
    if (!review) throw new Error("Review not found.");
    if (review.userId !== userId) throw new Error("You can only edit your own review.");

    const comment = args.comment?.trim();
    if (comment && comment.length > MAX_REVIEW_COMMENT_LENGTH) {
      throw new Error(`Comment must be at most ${MAX_REVIEW_COMMENT_LENGTH} characters.`);
    }

    const newRatings = normalizeRatings(args.ratings);
    const imageIds = await validateReviewImageIds(ctx, args.imageIds, userId);
    const removed = reviewImageIdsRemoved(review.imageIds, imageIds);
    if (removed.length > 0) {
      await deleteReviewImagesIfPresent(ctx, removed);
    }

    await ctx.db.patch(args.reviewId, {
      ratings: newRatings,
      comment: comment || undefined,
      imageIds,
      isAnonymous: args.isAnonymous,
      updatedAt: args.nowMs,
    });
    await recordReviewUpdate(
      ctx,
      review.college,
      review.ratings,
      newRatings,
      args.nowMs,
    );
    return null;
  },
});

export const voteReview = mutation({
  args: {
    reviewId: v.id("collegeReviews"),
    direction: v.union(v.literal("up"), v.literal("down")),
    nowMs: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId } = await requireActiveUser(ctx);
    const review = await ctx.db.get(args.reviewId);
    if (!review) throw new Error("Review not found.");
    if (review.userId === userId) {
      throw new Error("You cannot vote on your own review.");
    }

    const targetValue = args.direction === "up" ? 1 : -1;
    const existing = await ctx.db
      .query("collegeReviewVotes")
      .withIndex("by_reviewId_and_userId", (q) =>
        q.eq("reviewId", args.reviewId).eq("userId", userId),
      )
      .unique();

    const currentScore = review.voteScore ?? 0;

    if (!existing) {
      await ctx.db.insert("collegeReviewVotes", {
        reviewId: args.reviewId,
        userId,
        value: targetValue,
        updatedAt: args.nowMs,
      });
      await ctx.db.patch(args.reviewId, {
        voteScore: currentScore + targetValue,
      });
      return null;
    }

    if (existing.value === targetValue) {
      await ctx.db.delete(existing._id);
      await ctx.db.patch(args.reviewId, {
        voteScore: currentScore - targetValue,
      });
      return null;
    }

    await ctx.db.patch(existing._id, {
      value: targetValue,
      updatedAt: args.nowMs,
    });
    await ctx.db.patch(args.reviewId, {
      voteScore: currentScore - existing.value + targetValue,
    });
    return null;
  },
});

export const reportReview = mutation({
  args: {
    reviewId: v.id("collegeReviews"),
    reason: v.optional(v.string()),
    nowMs: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId } = await requireActiveUser(ctx);
    const review = await ctx.db.get(args.reviewId);
    if (!review) throw new Error("Review not found.");
    if (review.userId === userId) {
      throw new Error("You cannot report your own review.");
    }

    const existing = await ctx.db
      .query("collegeReviewReports")
      .withIndex("by_reviewId", (q) => q.eq("reviewId", args.reviewId))
      .collect();
    if (existing.some((r) => r.reporterUserId === userId)) {
      return null;
    }

    await ctx.db.insert("collegeReviewReports", {
      reviewId: args.reviewId,
      reporterUserId: userId,
      reason: args.reason?.trim() || undefined,
      createdAt: args.nowMs,
    });
    return null;
  },
});

export const listReviewsForCollege = query({
  args: {
    college: v.string(),
    sort: sortValidator,
    limit: v.optional(v.number()),
  },
  returns: v.array(publicReviewValidator),
  handler: async (ctx, args) => {
    const college = normalizeCollegeName(args.college);
    const limit = Math.min(args.limit ?? 50, 100);
    const viewerId = await optionalUserId(ctx);

    const rows = await ctx.db
      .query("collegeReviews")
      .withIndex("by_college", (q) => q.eq("college", college))
      .collect();

    const sorted = sortCollegeReviewRows(rows, args.sort).slice(0, limit);
    return Promise.all(sorted.map((r) => enrichReview(ctx, r, viewerId)));
  },
});

export const getCollegeAggregates = query({
  args: {
    college: v.string(),
  },
  returns: aggregatesValidator,
  handler: async (ctx, args) => {
    return await getCollegeAggregatesFromStats(ctx, args.college);
  },
});

export const getLeaderboard = query({
  args: {
    category: categoryValidator,
  },
  returns: v.array(leaderboardEntryValidator),
  handler: async (ctx, args) => {
    const category = args.category as CollegeReviewCategory;
    const dataByCollege = await loadLeaderboardInputsFromStats(ctx);
    return buildLeaderboardEntries(OXFORD_COLLEGES, dataByCollege, category);
  },
});

export const listPublicReviewsForUser = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  returns: v.array(publicReviewValidator),
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 50, 100);
    const viewerId = await optionalUserId(ctx);

    const rows = await ctx.db
      .query("collegeReviews")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const publicRows = rows.filter((r) => !r.isAnonymous);
    const sorted = sortCollegeReviewRows(publicRows, "recent").slice(0, limit);
    return Promise.all(sorted.map((r) => enrichReview(ctx, r, viewerId)));
  },
});

export const getPendingReviewListingIds = query({
  args: {
    nowMs: v.number(),
  },
  returns: v.array(v.id("listings")),
  handler: async (ctx, args) => {
    const userId = await optionalUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    if (!user) return [];

    const home = normalizeCollegeName(user.college ?? "");
    const listings = await ctx.db.query("listings").collect();
    const pending: Id<"listings">[] = [];

    for (const listing of listings) {
      if (!listing.members.includes(userId)) continue;
      const host = normalizeCollegeName(listing.college);
      if (home && host && home === host) continue;

      const confirmed = await hasConfirmedAttendance(ctx, listing._id, userId);
      const eligibility = getReviewEligibility(user, listing, userId, args.nowMs, {
        hasExistingReview: false,
        hasConfirmedAttendance: confirmed,
      });
      if (!eligibility.canReview) continue;

      const existing = await ctx.db
        .query("collegeReviews")
        .withIndex("by_listingId_and_userId", (q) =>
          q.eq("listingId", listing._id).eq("userId", userId),
        )
        .unique();
      if (!existing) pending.push(listing._id);
    }

    return pending;
  },
});
