import { v, type Infer } from "convex/values";
import { getAuthSessionId, getAuthUserId, invalidateSessions } from "@convex-dev/auth/server";
import { action, query } from "./_generated/server";
import type { DataModel } from "./_generated/dataModel";
import { optionalUserId } from "./guards";

/** Friends counted towards "joined through your invite" (capped scan). */
const REFERRAL_SCAN = 200;

/** What Settings → Account shows about the signed-in user. */
export const getMyAccountSummary = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      /** When the account was created (ms). */
      memberSince: v.number(),
      /** People who signed up through your invite link or a seat link. */
      friendsJoined: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const userId = await optionalUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    let friendsJoined = 0;
    for (const status of ["pending", "earned", "void"] as const) {
      const rows = await ctx.db
        .query("referrals")
        .withIndex("by_inviterId_and_status", (q) =>
          q.eq("inviterId", userId).eq("status", status),
        )
        .take(REFERRAL_SCAN);
      friendsJoined += rows.length;
    }
    return { memberSince: user._creationTime, friendsJoined };
  },
});

/** Sign out everywhere except the device making the call. */
export const signOutOtherDevices = action({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    const sessionId = await getAuthSessionId(ctx);
    if (!userId || !sessionId) throw new Error("Not authenticated");
    await invalidateSessions<DataModel>(ctx, { userId, except: [sessionId] });
    return null;
  },
});

/** Rows read per table for an export. Generous: one person's own data. */
const EXPORT_ROWS = 2000;

/**
 * Everything Oxformals holds that belongs to the signed-in user, for
 * Settings → Download my data. Raw documents, grouped by what they are.
 * Messages are only the ones you sent; other people's stay theirs.
 */
const exportSection = v.union(
  v.literal("profile"),
  v.literal("formals"),
  v.literal("reviews"),
  v.literal("social"),
  v.literal("messages"),
  v.literal("credits"),
  v.literal("notifications"),
);

export const exportMyData = query({
  args: {
    /** Which groups to include; everything when omitted. */
    sections: v.optional(v.array(exportSection)),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const userId = await optionalUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const n = EXPORT_ROWS;
    const db = ctx.db;
    const want = (section: Infer<typeof exportSection>) =>
      !args.sections || args.sections.includes(section);
    const out: Record<string, unknown> = { exportedAt: new Date().toISOString() };

    if (want("profile")) {
      out.profile = await db.get(userId);
      out.wantToGo = await db
        .query("collegeWishlists")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .take(n);
      out.badges = await db
        .query("userBadges")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .take(n);
    }
    if (want("formals")) {
      out.listings = await db
        .query("listings")
        .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", userId))
        .take(n);
      out.requestsSent = await db
        .query("requests")
        .withIndex("by_fromUserId", (q) => q.eq("fromUserId", userId))
        .take(n);
      out.requestsReceived = await db
        .query("requests")
        .withIndex("by_toUserId", (q) => q.eq("toUserId", userId))
        .take(n);
      out.attendance = await db
        .query("formalAttendanceConfirmations")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .take(n);
    }
    if (want("reviews")) {
      out.reviews = await db
        .query("collegeReviews")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .take(n);
      out.collegeTips = await db
        .query("collegeTips")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .take(n);
    }
    if (want("social")) {
      out.following = [
        ...(await db
          .query("follows")
          .withIndex("by_followerId_and_status", (q) =>
            q.eq("followerId", userId).eq("status", "active"),
          )
          .take(n)),
        ...(await db
          .query("follows")
          .withIndex("by_followerId_and_status", (q) =>
            q.eq("followerId", userId).eq("status", "pending"),
          )
          .take(n)),
      ];
      out.followers = await db
        .query("follows")
        .withIndex("by_followeeId_and_status", (q) =>
          q.eq("followeeId", userId).eq("status", "active"),
        )
        .take(n);
      out.blocked = await db
        .query("blocks")
        .withIndex("by_blockerId_and_blockedId", (q) => q.eq("blockerId", userId))
        .take(n);
      out.feedComments = await db
        .query("feedComments")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .take(n);
      out.feedLikes = await db
        .query("feedLikes")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .take(n);
      out.feedBookmarks = await db
        .query("feedBookmarks")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .take(n);
    }
    if (want("messages")) {
      out.messagesSent = await db
        .query("messages")
        .withIndex("by_senderUserId", (q) => q.eq("senderUserId", userId))
        .take(n);
    }
    if (want("credits")) {
      out.credits = await db
        .query("creditAccounts")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .take(n);
      out.inviteCode = await db
        .query("inviteCodes")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .take(n);
    }
    if (want("notifications")) {
      out.notifications = await db
        .query("notifications")
        .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", userId))
        .take(n);
    }
    return out;
  },
});
