import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { areFriends, makeFriends } from "./follows";
import { optionalUserId, requireActiveUser } from "./guards";
import { notify } from "./notify";
import { randomCode } from "./randomCode";
import { recordReferral } from "./referrals";
import { visibleAvatar } from "./userVisibility";

export const INVITE_CODE_LENGTH = 6;
/** How long the invite cookie lives, and so how new an account must be to count. */
export const INVITE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/** My invite link's code, made the first time I share it. */
export const getOrCreateMyInviteCode = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const { userId } = await requireActiveUser(ctx);
    const existing = await ctx.db
      .query("inviteCodes")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (existing) return existing.code;
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = randomCode(INVITE_CODE_LENGTH);
      const taken = await ctx.db
        .query("inviteCodes")
        .withIndex("by_code", (q) => q.eq("code", code))
        .first();
      if (taken) continue;
      await ctx.db.insert("inviteCodes", { userId, code, createdAt: Date.now() });
      return code;
    }
    throw new ConvexError("Couldn't make your invite link. Try again.");
  },
});

/** Public: who's behind an invite link (for oxformals.com/i/<code>). */
export const getInvitePreview = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const row = await ctx.db
      .query("inviteCodes")
      .withIndex("by_code", (q) => q.eq("code", code.trim().toLowerCase()))
      .first();
    if (!row) return null;
    const inviter = await ctx.db.get(row.userId);
    if (!inviter || inviter.deletedAt !== undefined) return null;
    const viewerId = await optionalUserId(ctx);
    return {
      inviter: {
        _id: inviter._id,
        name: inviter.name ?? "Someone",
        avatar: await visibleAvatar(ctx, viewerId, inviter),
      },
    };
  },
});

/**
 * After sign-in with an invite cookie: you and the inviter become friends
 * (both chose it, so privacy approval is skipped). A new account — created
 * after the link was first opened — also records a referral.
 */
export const claimInvite = mutation({
  args: { code: v.string(), openedAt: v.number() },
  returns: v.union(
    v.literal("joined"),
    v.literal("friends"),
    v.literal("own"),
    v.literal("invalid"),
  ),
  handler: async (ctx, { code, openedAt }) => {
    const { userId, user } = await requireActiveUser(ctx);
    const row = await ctx.db
      .query("inviteCodes")
      .withIndex("by_code", (q) => q.eq("code", code.trim().toLowerCase()))
      .first();
    if (!row) return "invalid";
    if (row.userId === userId) return "own";
    const inviter = await ctx.db.get(row.userId);
    if (!inviter || inviter.deletedAt !== undefined) return "invalid";

    const wereFriends = await areFriends(ctx, userId, row.userId);
    await makeFriends(ctx, userId, row.userId);

    const now = Date.now();
    const isNewAccount =
      openedAt >= row.createdAt &&
      user._creationTime >= openedAt &&
      now - user._creationTime <= INVITE_WINDOW_MS;
    if (
      isNewAccount &&
      (await recordReferral(ctx, { inviterId: row.userId, inviteeId: userId, source: "link" }))
    ) {
      await notify(ctx, { userId: row.userId, kind: "invite_joined", actorId: userId });
      return "joined";
    }
    if (!wereFriends) {
      await notify(ctx, { userId: row.userId, kind: "now_friends", actorId: userId });
    }
    return "friends";
  },
});
