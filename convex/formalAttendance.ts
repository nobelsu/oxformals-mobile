import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  canConfirmAttendanceCollegeListing,
  listingIsPast,
} from "../lib/data/collegeReviewEligibility";
import { normalizeCollegeName } from "../lib/data/colleges";
import {
  rowCountsAsAttended,
  validateDeclineReason,
} from "../lib/data/formalAttendance";
import { applyAttendanceConfirmation } from "../lib/data/collegeStats";
import { removeUserFromListingGroup } from "./listingMembership";
import { getOrCreateCollegeStatsDoc } from "./collegeStats";

const declinePresetValidator = v.string();

export async function getAttendanceResponse(
  ctx: QueryCtx | MutationCtx,
  listingId: Id<"listings">,
  userId: Id<"users">,
): Promise<Doc<"formalAttendanceConfirmations"> | null> {
  return await ctx.db
    .query("formalAttendanceConfirmations")
    .withIndex("by_listingId_and_userId", (q) =>
      q.eq("listingId", listingId).eq("userId", userId),
    )
    .unique();
}

export async function hasRespondedToAttendance(
  ctx: QueryCtx | MutationCtx,
  listingId: Id<"listings">,
  userId: Id<"users">,
): Promise<boolean> {
  const row = await getAttendanceResponse(ctx, listingId, userId);
  return row !== null;
}

export async function hasConfirmedAttendance(
  ctx: QueryCtx | MutationCtx,
  listingId: Id<"listings">,
  userId: Id<"users">,
): Promise<boolean> {
  const row = await getAttendanceResponse(ctx, listingId, userId);
  return rowCountsAsAttended(row);
}

export async function hasDeclinedAttendance(
  ctx: QueryCtx | MutationCtx,
  listingId: Id<"listings">,
  userId: Id<"users">,
): Promise<boolean> {
  const row = await getAttendanceResponse(ctx, listingId, userId);
  return row !== null && row.attended === false;
}

async function requireUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated.");
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("User not found.");
  return { userId, user };
}

function listingEligibilityInput(listing: Doc<"listings">) {
  return {
    college: listing.college,
    dateTime: listing.dateTime,
    members: listing.members.map(String),
    ownerUserId: listing.ownerUserId,
  };
}

export async function isFirstConfirmationForListing(
  ctx: MutationCtx,
  listingId: Id<"listings">,
): Promise<boolean> {
  const rows = await ctx.db
    .query("formalAttendanceConfirmations")
    .withIndex("by_listingId", (q) => q.eq("listingId", listingId))
    .collect();
  return !rows.some((row) => rowCountsAsAttended(row));
}

export async function recordAttendanceConfirmation(
  ctx: MutationCtx,
  listing: Doc<"listings">,
  userId: Id<"users">,
  nowMs: number,
): Promise<Id<"formalAttendanceConfirmations">> {
  const college = normalizeCollegeName(listing.college);
  if (!college) throw new Error("Invalid college.");

  const isFirst = await isFirstConfirmationForListing(ctx, listing._id);
  const doc = await getOrCreateCollegeStatsDoc(ctx, college, nowMs);
  const next = applyAttendanceConfirmation(
    {
      reviewCount: doc.reviewCount,
      ratingSums: doc.ratingSums,
      attendanceCount: doc.attendanceCount,
      completedFormalCount: doc.completedFormalCount,
    },
    isFirst,
  );
  await ctx.db.patch(doc._id, { ...next, updatedAt: nowMs });

  return await ctx.db.insert("formalAttendanceConfirmations", {
    listingId: listing._id,
    userId,
    confirmedAt: nowMs,
    attended: true,
  });
}

export const confirmAttendance = mutation({
  args: {
    listingId: v.id("listings"),
    nowMs: v.number(),
  },
  returns: v.id("formalAttendanceConfirmations"),
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    const listing = await ctx.db.get(args.listingId);
    if (!listing) throw new Error("Listing not found.");

    if (await hasRespondedToAttendance(ctx, args.listingId, userId)) {
      throw new Error("You already responded about this formal.");
    }

    const eligibility = canConfirmAttendanceCollegeListing(
      { id: userId, college: user.college },
      listingEligibilityInput(listing),
      args.nowMs,
      { hasRespondedToAttendance: false },
    );
    if (!eligibility.canConfirm) {
      throw new Error(eligibility.reason ?? "You cannot confirm attendance.");
    }

    return await recordAttendanceConfirmation(ctx, listing, userId, args.nowMs);
  },
});

export const declineAttendance = mutation({
  args: {
    listingId: v.id("listings"),
    nowMs: v.number(),
    reasonPreset: declinePresetValidator,
    reasonOther: v.optional(v.string()),
    removeFromHistory: v.boolean(),
  },
  returns: v.id("formalAttendanceConfirmations"),
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    const listing = await ctx.db.get(args.listingId);
    if (!listing) throw new Error("Listing not found.");

    if (await hasRespondedToAttendance(ctx, args.listingId, userId)) {
      throw new Error("You already responded about this formal.");
    }

    const eligibility = canConfirmAttendanceCollegeListing(
      { id: userId, college: user.college },
      listingEligibilityInput(listing),
      args.nowMs,
      { hasRespondedToAttendance: false },
    );
    if (!eligibility.canConfirm) {
      throw new Error(eligibility.reason ?? "You cannot update attendance.");
    }

    const validated = validateDeclineReason(args.reasonPreset, args.reasonOther);
    if (!validated.ok) {
      throw new Error(validated.error);
    }

    const id = await ctx.db.insert("formalAttendanceConfirmations", {
      listingId: args.listingId,
      userId,
      confirmedAt: args.nowMs,
      attended: false,
      reasonPreset: validated.reasonPreset,
      ...(validated.reasonOther ? { reasonOther: validated.reasonOther } : {}),
    });

    if (args.removeFromHistory) {
      await removeUserFromListingGroup(ctx, args.listingId, userId);
    }

    return id;
  },
});

export const getPendingAttendanceListingIds = query({
  args: {
    nowMs: v.number(),
  },
  returns: v.array(v.id("listings")),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    if (!user) return [];

    const home = normalizeCollegeName(user.college ?? "");
    const listings = await ctx.db.query("listings").collect();
    const pending: Id<"listings">[] = [];

    for (const listing of listings) {
      if (!listing.members.includes(userId)) continue;
      if (listing.ownerUserId === userId) continue;
      if (!listingIsPast(listing.dateTime, args.nowMs)) continue;

      const host = normalizeCollegeName(listing.college);
      if (home && host && home === host) continue;

      if (await hasRespondedToAttendance(ctx, listing._id, userId)) continue;

      const review = await ctx.db
        .query("collegeReviews")
        .withIndex("by_listingId_and_userId", (q) =>
          q.eq("listingId", listing._id).eq("userId", userId),
        )
        .unique();
      if (review) continue;

      pending.push(listing._id);
    }

    return pending;
  },
});
