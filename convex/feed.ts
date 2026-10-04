import { v } from "convex/values";
import { blockedIdsFor } from "./blocks";
import type { Doc, Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { optionalUserId, sanitizePublicUser } from "./guards";
import { visibleUser } from "./userVisibility";
import { activityVisibility } from "./follows";
import { enrichListing } from "./listingHelpers";
import { rowCountsAsAttended } from "../lib/data/formalAttendance";
import { collegeToSlug } from "../lib/data/collegeSlug";

/** How many rows to scan per source before merging. Bounded like getProfileActivity. */
const SOURCE_SCAN = 120;
const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 50;
const FOLLOW_SCAN = 500;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
/** For you ranks wishlist colleges and people you follow as if this much newer. */
const PRIORITY_BOOST_MS = 3 * 24 * 60 * 60 * 1000;

type PublicActor = ReturnType<typeof sanitizePublicUser>;

/**
 * The campus feed (follows-free v1). Merges recent non-anonymous reviews, newly
 * listed upcoming formals, and attended formals from across Oxford, newest
 * first, each tagged with its actor. Lightly personalised: items at a college
 * on the viewer's wishlist are flagged `onWishlist` for a badge, and For you
 * ranks them (and people you follow) above the rest.
 *
 * Bounded reads (SOURCE_SCAN per source) and a MAX_LIMIT cap — no pagination.
 * Revisit both when a follow graph narrows the source set and real volume
 * demands paging; this is deliberately the same tradeoff as getProfileActivity.
 */
export const getCampusFeed = query({
  args: {
    limit: v.optional(v.number()),
    /**
     * "forYou" (default): listings and reviews from everywhere, with your
     * wishlist colleges and people you follow first. "following": people you
     * follow.
     * Either way, "went to" items only ever show people you follow.
     */
    scope: v.optional(
      v.union(v.literal("forYou"), v.literal("following"), v.literal("everyone")),
    ),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const viewerId = await optionalUserId(ctx);
    const scope = args.scope === "everyone" ? "forYou" : (args.scope ?? "forYou");

    // You plus everyone you follow.
    const followed = new Set<string>(viewerId ? [viewerId] : []);
    if (viewerId) {
      const rows = await ctx.db
        .query("follows")
        .withIndex("by_followerId_and_status", (q) =>
          q.eq("followerId", viewerId).eq("status", "active"),
        )
        .take(FOLLOW_SCAN);
      for (const row of rows) followed.add(row.followeeId);
    }

    // Viewer's wishlist colleges (denormalised on the user doc).
    let wishlist = new Set<string>();
    if (viewerId) {
      const viewer = await ctx.db.get(viewerId);
      wishlist = new Set(viewer?.wishlistColleges ?? []);
    }
    const wishlistEmpty = wishlist.size === 0;

    // Listings and reviews: everything (For you) or by person (Following),
    // never from someone you've blocked or who blocked you.
    const blocked = await blockedIdsFor(ctx, viewerId);
    const inScope = (userId: Id<"users">) =>
      !blocked.has(userId) && (scope === "following" ? followed.has(userId) : true);

    // Cache actor lookups: many items share an author/owner.
    const actorCache = new Map<string, PublicActor | null>();
    const getActor = async (
      userId: Id<"users">,
    ): Promise<PublicActor | null> => {
      const cached = actorCache.get(userId);
      if (cached !== undefined) return cached;
      const user = await ctx.db.get(userId);
      // A private host the viewer can't see shows as name and initials.
      const actor = user ? await visibleUser(ctx, viewerId, user) : null;
      actorCache.set(userId, actor);
      return actor;
    };

    // Private accounts' reviews and attendances are only for their followers.
    const canSee = activityVisibility(ctx, viewerId);

    const nowIso = new Date().toISOString();

    type FeedItem =
      | {
          kind: "listing";
          key: string;
          ts: number;
          onWishlist: boolean;
          actor: PublicActor;
          listing: Awaited<ReturnType<typeof enrichListing>>;
        }
      | {
          kind: "review";
          key: string;
          ts: number;
          onWishlist: boolean;
          actor: PublicActor;
          college: string;
          ratings: Doc<"collegeReviews">["ratings"];
          comment: string | null;
          imageUrls: string[];
        }
      | {
          kind: "attended";
          key: string;
          ts: number;
          onWishlist: boolean;
          actors: PublicActor[];
          attendeeCount: number;
          college: string;
          dateTime: string;
        };

    // Rank first, build later: the expensive lookups (hosts, enrichment, photo
    // URLs) only run for the items that make the cut.
    type Candidate = { rank: number; build: () => Promise<FeedItem | null> };
    const candidates: Candidate[] = [];
    // Newest first; For you bumps wishlist colleges and people you follow.
    const rankOf = (ts: number, mine: boolean) =>
      scope === "forYou" && mine ? ts + PRIORITY_BOOST_MS : ts;

    // Newly listed, still-upcoming formals.
    const listingDocs = await ctx.db
      .query("listings")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .order("desc")
      .take(SOURCE_SCAN);
    for (const listing of listingDocs) {
      if (!inScope(listing.ownerUserId)) continue;
      if (listing.dateTime <= nowIso) continue;
      candidates.push({
        rank: rankOf(
          listing._creationTime,
          wishlist.has(listing.college) || followed.has(listing.ownerUserId),
        ),
        build: async () => {
          const actor = await getActor(listing.ownerUserId);
          if (!actor) return null;
          return {
            kind: "listing",
            key: `listing:${listing._id}`,
            ts: listing._creationTime,
            onWishlist: wishlist.has(listing.college),
            actor,
            listing: await enrichListing(ctx, listing),
          };
        },
      });
    }

    // Recent public reviews.
    const reviewDocs = await ctx.db
      .query("collegeReviews")
      .order("desc")
      .take(SOURCE_SCAN);
    for (const review of reviewDocs) {
      if (!inScope(review.userId)) continue;
      if (review.isAnonymous) continue;
      candidates.push({
        rank: rankOf(
          review.updatedAt,
          wishlist.has(review.college) || followed.has(review.userId),
        ),
        build: async () => {
          if (!(await canSee(review.userId))) return null;
          const actor = await getActor(review.userId);
          if (!actor) return null;
          const imageUrls: string[] = [];
          for (const imageId of review.imageIds ?? []) {
            const url = await ctx.storage.getUrl(imageId);
            if (url) imageUrls.push(url);
          }
          return {
            kind: "review",
            key: `review:${review._id}`,
            ts: review.updatedAt,
            onWishlist: wishlist.has(review.college),
            actor,
            college: review.college,
            ratings: review.ratings,
            comment: review.comment ?? null,
            imageUrls,
          };
        },
      });
    }

    // Attended formals — bundled by (college, night): everyone who went to the
    // same college's formal on the same date collapses into one item.
    const attendanceDocs = await ctx.db
      .query("formalAttendanceConfirmations")
      .order("desc")
      .take(SOURCE_SCAN);
    type AttendedBundle = {
      key: string;
      college: string;
      dateTime: string;
      ts: number;
      actors: Map<string, PublicActor>;
    };
    const bundles = new Map<string, AttendedBundle>();
    for (const row of attendanceDocs) {
      // Who went where is only for the people who follow them.
      if (!followed.has(row.userId)) continue;
      if (!rowCountsAsAttended(row)) continue;
      if (!(await canSee(row.userId))) continue;
      const listing = await ctx.db.get(row.listingId);
      if (!listing) continue;
      const actor = await getActor(row.userId);
      if (!actor) continue;
      // dateTime is stored as a UTC ISO string; its date portion is a stable,
      // TZ-free night key.
      const dateKey = listing.dateTime.slice(0, 10);
      const key = `attended:${collegeToSlug(listing.college)}:${dateKey}`;
      const bundle =
        bundles.get(key) ??
        {
          key,
          college: listing.college,
          dateTime: listing.dateTime,
          ts: 0,
          actors: new Map<string, PublicActor>(),
        };
      if (!bundle.actors.has(actor._id)) bundle.actors.set(actor._id, actor);
      bundle.ts = Math.max(bundle.ts, row.confirmedAt);
      bundles.set(key, bundle);
    }
    // Already limited to people you follow, so these are cheap and always "yours".
    for (const bundle of bundles.values()) {
      const item: FeedItem = {
        kind: "attended",
        key: bundle.key,
        ts: bundle.ts,
        onWishlist: wishlist.has(bundle.college),
        actors: [...bundle.actors.values()],
        attendeeCount: bundle.actors.size,
        college: bundle.college,
        dateTime: bundle.dateTime,
      };
      candidates.push({ rank: rankOf(bundle.ts, true), build: async () => item });
    }

    candidates.sort((a, b) => b.rank - a.rank);
    const sliced: FeedItem[] = [];
    for (const candidate of candidates) {
      if (sliced.length >= limit) break;
      const item = await candidate.build();
      if (item) sliced.push(item);
    }

    // Attach comment + like counts only for the items we return.
    const withCounts = await Promise.all(
      sliced.map(async (item) => {
        const comments = await ctx.db
          .query("feedComments")
          .withIndex("by_targetKey", (q) => q.eq("targetKey", item.key))
          .collect();
        const likes = await ctx.db
          .query("feedLikes")
          .withIndex("by_targetKey", (q) => q.eq("targetKey", item.key))
          .collect();
        const bookmark = viewerId
          ? await ctx.db
              .query("feedBookmarks")
              .withIndex("by_targetKey_and_userId", (q) =>
                q.eq("targetKey", item.key).eq("userId", viewerId),
              )
              .unique()
          : null;
        // The 3 most recent comments (oldest-of-the-three first) as an inline
        // preview; the full thread loads on demand.
        const ordered = [...comments].sort(
          (a, b) => a._creationTime - b._creationTime,
        );
        const commentPreview = await Promise.all(
          ordered.slice(-3).map(async (c) => {
            const author = await getActor(c.userId);
            return { name: author?.name ?? "Someone", text: c.text };
          }),
        );
        return {
          ...item,
          commentCount: comments.length,
          commentPreview,
          likeCount: likes.length,
          viewerLiked:
            viewerId !== null && likes.some((l) => l.userId === viewerId),
          viewerBookmarked: bookmark !== null,
        };
      }),
    );

    return { items: withCounts, wishlistEmpty };
  },
});

/**
 * Open formals in the next 7 days, one bubble per college per night (London
 * time), soonest first. Colleges on the viewer's wishlist are flagged.
 */
export const getWeekFormals = query({
  args: {},
  returns: v.array(
    v.object({
      key: v.string(),
      college: v.string(),
      dateTime: v.string(),
      listingIds: v.array(v.id("listings")),
      onWishlist: v.boolean(),
    }),
  ),
  handler: async (ctx) => {
    const viewerId = await optionalUserId(ctx);
    const viewer = viewerId ? await ctx.db.get(viewerId) : null;
    const wishlist = new Set(viewer?.wishlistColleges ?? []);
    const now = Date.now();
    const listings = await ctx.db
      .query("listings")
      .withIndex("by_status_and_dateTime", (q) =>
        q
          .eq("status", "active")
          .gt("dateTime", new Date(now).toISOString())
          .lt("dateTime", new Date(now + WEEK_MS).toISOString()),
      )
      .take(100);
    const nightOf = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const bubbles = new Map<
      string,
      { key: string; college: string; dateTime: string; listingIds: Id<"listings">[]; onWishlist: boolean }
    >();
    for (const listing of listings) {
      if (listing.seatsAvailable <= 0) continue;
      // Your own formals and ones you've already joined aren't for browsing.
      if (viewerId && listing.members.includes(viewerId)) continue;
      if (viewerId && listing.ownerUserId === viewerId) continue;
      const key = `${collegeToSlug(listing.college)}:${nightOf.format(new Date(listing.dateTime))}`;
      const bubble = bubbles.get(key);
      if (bubble) {
        bubble.listingIds.push(listing._id);
      } else {
        bubbles.set(key, {
          key,
          college: listing.college,
          dateTime: listing.dateTime,
          listingIds: [listing._id],
          onWishlist: wishlist.has(listing.college),
        });
      }
    }
    return [...bubbles.values()].sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  },
});
