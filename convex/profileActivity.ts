import { v } from "convex/values";
import { query } from "./_generated/server";
import { enrichListing } from "./listingHelpers";
import { rowCountsAsAttended } from "../lib/data/formalAttendance";
import { canSeeActivity, isActiveFollower } from "./follows";
import { optionalUserId } from "./guards";

/**
 * The Beli-style profile stream: active listings, attended formals and
 * public non-anonymous reviews merged newest-first. Bounded reads (200 per
 * source) and a 50-item cap; revisit pagination when real volume demands it.
 */
export const getProfileActivity = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Listings are always public; a private account's formals attended and
    // reviews are only for itself and its followers.
    const viewerId = await optionalUserId(ctx);
    const owner = await ctx.db.get(args.userId);
    const visible = await canSeeActivity(ctx, viewerId, owner);
    // Which formals someone went to is only for them and their followers,
    // public account or not (the count stays visible).
    const seesAttended =
      visible &&
      viewerId !== null &&
      (viewerId === args.userId || (await isActiveFollower(ctx, viewerId, args.userId)));

    const listingDocs = await ctx.db
      .query("listings")
      .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", args.userId))
      .take(200);
    const activeListings: Array<
      Awaited<ReturnType<typeof enrichListing>>
    > = [];
    for (const listing of listingDocs) {
      if (listing.status !== "active") continue;
      activeListings.push(await enrichListing(ctx, listing));
    }

    const attendanceRows = visible
      ? await ctx.db
          .query("formalAttendanceConfirmations")
          .withIndex("by_userId", (q) => q.eq("userId", args.userId))
          .take(200)
      : [];
    const attendedItems: Array<
      | {
          kind: "attended";
          ts: number;
          college: string;
          dateTime: string;
          hosted: boolean;
          price?: number;
        }
    > = [];
    for (const row of attendanceRows) {
      if (!rowCountsAsAttended(row)) continue;
      const listing = await ctx.db.get(row.listingId);
      if (!listing) continue;
      const parsed = Date.parse(listing.dateTime);
      attendedItems.push({
        kind: "attended",
        ts: Number.isNaN(parsed) ? row.confirmedAt : parsed,
        college: listing.college,
        dateTime: listing.dateTime,
        hosted: listing.ownerUserId === args.userId,
        ...(listing.price !== undefined ? { price: listing.price } : {}),
      });
    }

    const reviewDocs = visible
      ? await ctx.db
          .query("collegeReviews")
          .withIndex("by_userId", (q) => q.eq("userId", args.userId))
          .take(200)
      : [];
    const reviewItems = reviewDocs
      .filter((r) => !r.isAnonymous)
      .map((r) => ({
        kind: "review" as const,
        ts: r.updatedAt,
        college: r.college,
        ratings: r.ratings,
        comment: r.comment ?? null,
      }));

    const items = [
      ...activeListings.map((l) => ({
        kind: "listing" as const,
        ts: l._creationTime,
        listing: l,
      })),
      ...(seesAttended ? attendedItems : []),
      ...reviewItems,
    ]
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 50);

    return {
      items,
      hidden: !visible,
      stats: {
        activeCount: activeListings.length,
        reviewCount: reviewItems.length,
        attendedCount: attendedItems.length,
      },
    };
  },
});
