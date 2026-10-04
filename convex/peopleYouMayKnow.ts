import { v } from "convex/values";
import { blockedIdsFor } from "./blocks";
import type { Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { optionalUserId } from "./guards";
import { visibleUser } from "./userVisibility";

/** Bounds keep this one query well inside Convex's read limits. */
const FRIENDS_SCANNED = 40;
const THEIR_FOLLOWS_SCANNED = 40;
const SAME_COLLEGE_SCANNED = 100;
const FORMALS_SCANNED = 50;
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

type Score = { mutualFriends: number; sharedFormals: number; sameCollege: boolean };

/**
 * Friends of friends, people from your college, and people you've sat with at
 * a formal in the last year. Score = 3 × mutual friends + 2 × shared formals
 * + 1 × same college. Private accounts can appear (following sends a request).
 */
export const getPeopleYouMayKnow = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const me = await optionalUserId(ctx);
    if (!me) return [];
    const meDoc = await ctx.db.get(me);
    if (!meDoc) return [];
    const max = Math.min(Math.max(1, Math.floor(limit ?? 10)), 20);

    const exclude = new Set<Id<"users">>([me, ...(await blockedIdsFor(ctx, me))]);
    for (const status of ["active", "pending"] as const) {
      for (const row of await ctx.db
        .query("follows")
        .withIndex("by_followerId_and_status", (q) => q.eq("followerId", me).eq("status", status))
        .take(500)) {
        exclude.add(row.followeeId);
      }
    }

    const scores = new Map<Id<"users">, Score>();
    const score = (id: Id<"users">) => {
      let s = scores.get(id);
      if (!s) {
        s = { mutualFriends: 0, sharedFormals: 0, sameCollege: false };
        scores.set(id, s);
      }
      return s;
    };

    // Friends of friends: people followed by those I follow.
    const iFollow = await ctx.db
      .query("follows")
      .withIndex("by_followerId_and_status", (q) => q.eq("followerId", me).eq("status", "active"))
      .take(FRIENDS_SCANNED);
    for (const row of iFollow) {
      const theirs = await ctx.db
        .query("follows")
        .withIndex("by_followerId_and_status", (q) =>
          q.eq("followerId", row.followeeId).eq("status", "active"),
        )
        .take(THEIR_FOLLOWS_SCANNED);
      for (const f of theirs) {
        if (!exclude.has(f.followeeId)) score(f.followeeId).mutualFriends++;
      }
    }

    // Same college.
    if (meDoc.college) {
      for (const u of await ctx.db
        .query("users")
        .withIndex("by_college", (q) => q.eq("college", meDoc.college))
        .take(SAME_COLLEGE_SCANNED)) {
        if (!exclude.has(u._id)) score(u._id).sameCollege = true;
      }
    }

    // Shared formals in the last year: ones I hosted, and ones I confirmed attending.
    const since = Date.now() - YEAR_MS;
    const listingIds = new Set<Id<"listings">>();
    for (const l of await ctx.db
      .query("listings")
      .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", me))
      .order("desc")
      .take(FORMALS_SCANNED)) {
      listingIds.add(l._id);
    }
    for (const c of await ctx.db
      .query("formalAttendanceConfirmations")
      .withIndex("by_userId", (q) => q.eq("userId", me))
      .order("desc")
      .take(FORMALS_SCANNED)) {
      if (c.attended !== false) listingIds.add(c.listingId);
    }
    for (const id of listingIds) {
      const listing = await ctx.db.get(id);
      if (!listing) continue;
      const at = Date.parse(listing.dateTime);
      if (Number.isNaN(at) || at < since || at > Date.now()) continue;
      for (const member of listing.members) {
        if (!exclude.has(member)) score(member).sharedFormals++;
      }
    }

    const ranked = [];
    for (const [id, s] of scores) {
      const user = await ctx.db.get(id);
      if (!user || user.deletedAt !== undefined) continue;
      ranked.push({
        user: await visibleUser(ctx, me, user),
        ...s,
        total: 3 * s.mutualFriends + 2 * s.sharedFormals + (s.sameCollege ? 1 : 0),
      });
    }
    ranked.sort(
      (a, b) => b.total - a.total || (a.user.name ?? "").localeCompare(b.user.name ?? ""),
    );
    return ranked.slice(0, max).map((r) => ({
      user: r.user,
      mutualFriends: r.mutualFriends,
      sharedFormals: r.sharedFormals,
      sameCollege: r.sameCollege,
    }));
  },
});
