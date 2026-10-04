import { v } from "convex/values";
import { query } from "./_generated/server";
import { optionalUserId, sanitizePublicUser } from "./guards";
import { normalizeCollegeName, OXFORD_COLLEGES } from "../lib/data/colleges";
import { rowCountsAsAttended } from "../lib/data/formalAttendance";

/**
 * What the Colleges pages lead with — signals every college has, even before
 * it has reviews: how many people want to go, formals coming up, members.
 */

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const entryValidator = v.object({
  college: v.string(),
  wantCount: v.number(),
  weekCount: v.number(),
  /** ISO time of the soonest upcoming formal with a free seat, if any. */
  nextAt: v.union(v.null(), v.string()),
  reviewCount: v.number(),
  rating: v.union(v.null(), v.number()),
  onMyWishlist: v.boolean(),
});

export const listDirectory = query({
  args: {},
  returns: v.array(entryValidator),
  handler: async (ctx) => {
    const viewerId = await optionalUserId(ctx);
    const viewer = viewerId ? await ctx.db.get(viewerId) : null;
    const mine = new Set((viewer?.wishlistColleges ?? []).map(normalizeCollegeName));

    const want = new Map<string, number>();
    for (const row of await ctx.db.query("collegeWishlists").take(10000)) {
      const c = normalizeCollegeName(row.college);
      want.set(c, (want.get(c) ?? 0) + 1);
    }

    const now = Date.now();
    const week = new Map<string, number>();
    const next = new Map<string, string>();
    const weekEnd = new Date(now + WEEK_MS).toISOString();
    // Ascending by date, so the first listing seen per college is its soonest.
    const upcoming = await ctx.db
      .query("listings")
      .withIndex("by_status_and_dateTime", (q) =>
        q.eq("status", "active").gt("dateTime", new Date(now).toISOString()),
      )
      .take(500);
    for (const l of upcoming) {
      if (l.seatsAvailable <= 0) continue;
      const c = normalizeCollegeName(l.college);
      if (!next.has(c)) next.set(c, l.dateTime);
      if (l.dateTime < weekEnd) week.set(c, (week.get(c) ?? 0) + 1);
    }

    const stats = new Map<string, { reviewCount: number; rating: number | null }>();
    for (const row of await ctx.db.query("collegeStats").take(200)) {
      stats.set(row.college, {
        reviewCount: row.reviewCount,
        rating:
          row.reviewCount > 0
            ? Math.round((row.ratingSums.overall / row.reviewCount) * 10) / 10
            : null,
      });
    }

    return OXFORD_COLLEGES.map((college) => ({
      college,
      wantCount: want.get(college) ?? 0,
      weekCount: week.get(college) ?? 0,
      nextAt: next.get(college) ?? null,
      reviewCount: stats.get(college)?.reviewCount ?? 0,
      rating: stats.get(college)?.rating ?? null,
      onMyWishlist: mine.has(college),
    }));
  },
});

/** Header figures and people for one college page. */
export const getOverview = query({
  args: { college: v.string() },
  handler: async (ctx, args) => {
    const college = normalizeCollegeName(args.college);
    const viewerId = await optionalUserId(ctx);
    const viewer = viewerId ? await ctx.db.get(viewerId) : null;

    const wantRows = await ctx.db
      .query("collegeWishlists")
      .withIndex("by_college", (q) => q.eq("college", college))
      .take(2000);

    // Members: people who list this as their college.
    const members = (await ctx.db.query("users").take(5000)).filter(
      (u) => !u.deletedAt && u.college && normalizeCollegeName(u.college) === college,
    );

    // Friends of yours (people you follow) who've been to a formal here.
    let friendsBeen = 0;
    if (viewerId) {
      const follows = await ctx.db
        .query("follows")
        .withIndex("by_followerId_and_status", (q) =>
          q.eq("followerId", viewerId).eq("status", "active"),
        )
        .take(200);
      for (const f of follows) {
        const rows = await ctx.db
          .query("formalAttendanceConfirmations")
          .withIndex("by_userId", (q) => q.eq("userId", f.followeeId))
          .take(50);
        for (const row of rows) {
          if (!rowCountsAsAttended(row)) continue;
          const listing = await ctx.db.get(row.listingId);
          if (listing && normalizeCollegeName(listing.college) === college) {
            friendsBeen++;
            break;
          }
        }
      }
    }

    return {
      college,
      wantCount: wantRows.length,
      onMyWishlist: wantRows.some((r) => r.userId === viewerId),
      memberCount: members.length,
      members: members
        .filter((m) => m._id !== viewerId && m.isPrivate !== true)
        .slice(0, 8)
        .map(sanitizePublicUser),
      friendsBeen,
      isMember: !!viewer?.college && normalizeCollegeName(viewer.college) === college,
    };
  },
});
