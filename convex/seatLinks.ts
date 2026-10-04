import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import { internalMutation, mutation, query } from "./_generated/server";
import { makeFriends } from "./follows";
import { optionalUserId, requireActiveUser } from "./guards";
import { notify } from "./notify";
import { randomCode } from "./randomCode";
import { recordReferral } from "./referrals";
import { visibleAvatar } from "./userVisibility";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

/**
 * Seat links: a seat in a group request for someone not on Oxformals yet.
 * The requester shares oxformals.com/s/<token>; whoever claims it becomes a
 * named friend in the request (and a friend of the requester). Unclaimed or
 * unanswered links lapse after 48 hours.
 */

export const SEAT_LINK_TTL_MS = 48 * 60 * 60 * 1000;
const TOKEN_LENGTH = 12;

export async function newSeatToken(ctx: MutationCtx): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const token = randomCode(TOKEN_LENGTH);
    const taken = await ctx.db
      .query("seatLinks")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    if (!taken) return token;
  }
  throw new Error("Couldn't make a link. Try again.");
}

/** First name, and a photo only if the viewer may see it (private accounts). */
async function publicPerson(
  ctx: QueryCtx,
  viewerId: Id<"users"> | null,
  u: Doc<"users"> | null,
) {
  const live = u && u.deletedAt === undefined ? u : null;
  return {
    name: live?.name?.trim().split(/\s+/)[0] || "Someone",
    avatar: live ? await visibleAvatar(ctx, viewerId, live) : undefined,
  };
}

/** Public: what oxformals.com/s/<token> shows. */
export const getSeatLinkPreview = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const link = await ctx.db
      .query("seatLinks")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    if (!link) return null;
    const req = await ctx.db.get(link.requestId);
    if (!req) return null;
    const listing = await ctx.db.get(req.targetListingId);
    if (!listing) return null;
    const seat = (req.party ?? []).find((p) => p.kind === "link" && p.token === token);
    const state =
      req.status !== "pending"
        ? ("closed" as const)
        : !seat
          ? ("used" as const)
          : seat.response === "out" || (seat.expiresAt ?? 0) <= Date.now()
            ? ("expired" as const)
            : ("open" as const);
    const viewerId = await optionalUserId(ctx);
    return {
      state,
      college: listing.college,
      dateTime: listing.dateTime,
      host: await publicPerson(ctx, viewerId, await ctx.db.get(listing.ownerUserId)),
      from: await publicPerson(ctx, viewerId, await ctx.db.get(req.fromUserId)),
    };
  },
});

/**
 * Turn the link seat into a named-friend seat for me. I then answer "I'm in"
 * / "Not me" like any named friend.
 */
export const claimSeatLink = mutation({
  args: { token: v.string() },
  returns: v.object({ requestId: v.id("requests") }),
  handler: async (ctx, { token }) => {
    const { userId, user } = await requireActiveUser(ctx);
    const link = await ctx.db
      .query("seatLinks")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    const req = link ? await ctx.db.get(link.requestId) : null;
    if (!link || !req) throw new Error("This link doesn't work any more.");
    if (req.status !== "pending") throw new Error("This request is closed.");
    const party = req.party ?? [];
    const index = party.findIndex((p) => p.kind === "link" && p.token === token);
    if (index === -1) throw new Error("This link has already been used.");
    const seat = party[index];
    if (seat.response === "out" || (seat.expiresAt ?? 0) <= Date.now()) {
      throw new Error("This link has expired.");
    }
    if (userId === req.fromUserId) {
      throw new Error("This is your own link. Send it to the person you're bringing.");
    }
    if (userId === req.toUserId) throw new Error("You're hosting this formal.");
    const listing = await ctx.db.get(req.targetListingId);
    if (
      listing?.members.includes(userId) ||
      party.some((p) => p.kind === "friend" && p.userId === userId)
    ) {
      throw new Error("You're already in this group.");
    }

    const next = [...party];
    next[index] = {
      kind: "friend",
      userId,
      payerId: seat.paysOwn ? userId : req.fromUserId,
      method: seat.method,
      response: "pending",
    };
    await ctx.db.patch(req._id, { party: next });
    await ctx.db.insert("partyInvites", { requestId: req._id, userId });
    await makeFriends(ctx, userId, req.fromUserId);
    if (user._creationTime >= link.createdAt) {
      await recordReferral(ctx, { inviterId: req.fromUserId, inviteeId: userId, source: "seat" });
    }
    await notify(ctx, {
      userId: req.fromUserId,
      kind: "seat_link_claimed",
      actorId: userId,
      listingId: req.targetListingId,
      requestId: req._id,
      ...(listing ? { data: { college: listing.college, dateTime: listing.dateTime } } : {}),
    });
    return { requestId: req._id };
  },
});

/** 48h after sending: an unclaimed or unanswered link drops out, like "Not me". */
export const expireSeatLink = internalMutation({
  args: { requestId: v.id("requests"), token: v.string() },
  returns: v.null(),
  handler: async (ctx, { requestId, token }) => {
    const req = await ctx.db.get(requestId);
    if (!req || req.status !== "pending") return null;
    const party = req.party ?? [];
    const index = party.findIndex((p) => p.kind === "link" && p.token === token);
    if (index === -1 || party[index].response === "out") return null;
    const next = [...party];
    next[index] = { ...party[index], response: "out" };
    await ctx.db.patch(requestId, { party: next });
    return null;
  },
});
