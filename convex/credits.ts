import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { optionalUserId, requireActiveUser } from "./guards";
import { listingIsPast } from "./listingHelpers";
import { notify } from "./notify";
import { maybeEarnReferral } from "./referrals";

/**
 * Seat credits. Host a guest who pays with a credit and you earn one; spend
 * one on a seat at any formal. Everyone starts with one. A credit is held when
 * the host accepts and paid out 24 hours after the formal, unless the guest
 * says it didn't happen.
 */

export const STARTER_CREDITS = 1;
export const PAYOUT_DELAY_MS = 24 * 60 * 60 * 1000;

type Ctx = QueryCtx | MutationCtx;

async function accountOf(ctx: Ctx, userId: Id<"users">) {
  return await ctx.db
    .query("creditAccounts")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
}

export async function creditBalance(
  ctx: Ctx,
  userId: Id<"users">,
): Promise<number> {
  const account = await accountOf(ctx, userId);
  return account ? account.balance : STARTER_CREDITS;
}

export async function adjustCredits(
  ctx: MutationCtx,
  userId: Id<"users">,
  delta: number,
): Promise<void> {
  const account = await accountOf(ctx, userId);
  if (account) {
    await ctx.db.patch(account._id, { balance: account.balance + delta });
  } else {
    await ctx.db.insert("creditAccounts", {
      userId,
      balance: STARTER_CREDITS + delta,
    });
  }
}

export type SeatCharge = {
  payerId: Id<"users">;
  seatHolderId: Id<"users">;
  isGuest: boolean;
};

/**
 * Take one credit per seat from each payer and hold it for the host. Throws
 * (so the accept rolls back) when a payer can't cover their seats.
 */
export async function holdSeatCredits(
  ctx: MutationCtx,
  args: {
    requestId: Id<"requests">;
    listing: Doc<"listings">;
    charges: SeatCharge[];
  },
): Promise<void> {
  const perPayer = new Map<Id<"users">, number>();
  for (const c of args.charges) {
    perPayer.set(c.payerId, (perPayer.get(c.payerId) ?? 0) + 1);
  }
  for (const [payerId, seats] of perPayer) {
    const balance = await creditBalance(ctx, payerId);
    if (balance < seats) {
      const payer = await ctx.db.get(payerId);
      const name = payer?.name?.split(" ")[0] ?? "They";
      throw new ConvexError(
        `${name} doesn't have enough seats for this any more (${balance} of ${seats}).`,
      );
    }
  }
  const formalAt = Date.parse(args.listing.dateTime);
  const releaseAt =
    (Number.isNaN(formalAt) ? Date.now() : formalAt) + PAYOUT_DELAY_MS;
  for (const [payerId, seats] of perPayer) {
    await adjustCredits(ctx, payerId, -seats);
  }
  for (const c of args.charges) {
    await ctx.db.insert("creditHolds", {
      requestId: args.requestId,
      listingId: args.listing._id,
      payerId: c.payerId,
      hostId: args.listing.ownerUserId,
      seatHolderId: c.seatHolderId,
      isGuest: c.isGuest,
      status: "held",
      releaseAt,
    });
  }
  const req = await ctx.db.get(args.requestId);
  await notify(ctx, {
    userId: args.listing.ownerUserId,
    kind: "credit_earned",
    ...(req ? { actorId: req.fromUserId } : {}),
    listingId: args.listing._id,
    requestId: args.requestId,
    data: {
      college: args.listing.college,
      dateTime: args.listing.dateTime,
      count: args.charges.length,
      pending: true,
    },
  });
}

async function refundHold(ctx: MutationCtx, hold: Doc<"creditHolds">) {
  if (hold.status !== "held" && hold.status !== "disputed") return;
  await ctx.db.patch(hold._id, { status: "refunded", resolvedAt: Date.now() });
  await adjustCredits(ctx, hold.payerId, 1);
}

/**
 * A member's seat was taken back before the formal: refund the credits held
 * for it (and for any unnamed guests they brought), including any already
 * reported as disputed. After the formal nothing is refunded here — that's
 * what "didn't happen" is for, and a dispute waits for the team.
 */
export async function refundSeatHolderCredits(
  ctx: MutationCtx,
  listing: Doc<"listings">,
  seatHolderId: Id<"users">,
  opts: { guestsOnly?: boolean; limit?: number } = {},
): Promise<number> {
  if (listingIsPast(listing.dateTime, Date.now())) return 0;
  const holds = await ctx.db
    .query("creditHolds")
    .withIndex("by_listingId_and_seatHolderId", (q) =>
      q.eq("listingId", listing._id).eq("seatHolderId", seatHolderId),
    )
    .take(50);
  let refunded = 0;
  for (const hold of holds) {
    if (hold.status !== "held" && hold.status !== "disputed") continue;
    if (opts.guestsOnly && !hold.isGuest) continue;
    if (opts.limit !== undefined && refunded >= opts.limit) break;
    await refundHold(ctx, hold);
    refunded++;
  }
  return refunded;
}

/** The formal was cancelled: every credit held for it goes back. */
export async function refundListingCredits(
  ctx: MutationCtx,
  listingId: Id<"listings">,
): Promise<void> {
  const holds = await ctx.db
    .query("creditHolds")
    .withIndex("by_listingId", (q) => q.eq("listingId", listingId))
    .take(100);
  for (const hold of holds) {
    await refundHold(ctx, hold);
  }
}

export const getMyCredits = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({ balance: v.number(), spending: v.number(), earning: v.number() }),
  ),
  handler: async (ctx) => {
    const userId = await optionalUserId(ctx);
    if (!userId) return null;
    const spending = await ctx.db
      .query("creditHolds")
      .withIndex("by_payerId_and_status", (q) =>
        q.eq("payerId", userId).eq("status", "held"),
      )
      .take(100);
    const earning = await ctx.db
      .query("creditHolds")
      .withIndex("by_hostId_and_status", (q) =>
        q.eq("hostId", userId).eq("status", "held"),
      )
      .take(100);
    return {
      balance: await creditBalance(ctx, userId),
      spending: spending.length,
      earning: earning.length,
    };
  },
});

/** Credits I have riding on a listing, for the "didn't happen" link. */
export const getMyHoldsForListing = query({
  args: { listingId: v.id("listings") },
  returns: v.object({ held: v.number(), disputed: v.number() }),
  handler: async (ctx, { listingId }) => {
    const userId = await optionalUserId(ctx);
    if (!userId) return { held: 0, disputed: 0 };
    const holds = await ctx.db
      .query("creditHolds")
      .withIndex("by_listingId", (q) => q.eq("listingId", listingId))
      .take(100);
    const mine = holds.filter((h) => h.payerId === userId);
    return {
      held: mine.filter((h) => h.status === "held").length,
      disputed: mine.filter((h) => h.status === "disputed").length,
    };
  },
});

/**
 * "This formal didn't happen": stops the payout for the credits I paid and
 * sends it to the team to sort out.
 */
export const reportFormalDidntHappen = mutation({
  args: { listingId: v.id("listings") },
  returns: v.null(),
  handler: async (ctx, { listingId }) => {
    const { userId } = await requireActiveUser(ctx);
    const listing = await ctx.db.get(listingId);
    if (listing && !listingIsPast(listing.dateTime, Date.now())) {
      throw new ConvexError(
        "This formal hasn't happened yet. If you can't go, leave the group and your seat comes back.",
      );
    }
    const holds = await ctx.db
      .query("creditHolds")
      .withIndex("by_listingId", (q) => q.eq("listingId", listingId))
      .take(100);
    const mine = holds.filter(
      (h) => h.payerId === userId && h.status === "held",
    );
    if (mine.length === 0) {
      throw new ConvexError("There are no seats waiting to be paid for this formal.");
    }
    for (const hold of mine) {
      await ctx.db.patch(hold._id, { status: "disputed" });
    }
    await ctx.scheduler.runAfter(0, internal.emails.sendCreditDisputeEmail, {
      listingId,
      reporterId: userId,
      credits: mine.length,
    });
    return null;
  },
});

/** Hourly: pay hosts for formals that ended over 24 hours ago. */
export const settleDueHolds = internalMutation({
  args: {},
  returns: v.object({ paid: v.number() }),
  handler: async (ctx) => {
    const due = await ctx.db
      .query("creditHolds")
      .withIndex("by_status_and_releaseAt", (q) =>
        q.eq("status", "held").lte("releaseAt", Date.now()),
      )
      .take(200);
    const paidOut = new Map<
      string,
      { hostId: Id<"users">; listingId: Id<"listings">; count: number }
    >();
    for (const hold of due) {
      await ctx.db.patch(hold._id, { status: "paid", resolvedAt: Date.now() });
      await adjustCredits(ctx, hold.hostId, 1);
      const key = `${hold.hostId}|${hold.listingId}`;
      const entry = paidOut.get(key) ?? {
        hostId: hold.hostId,
        listingId: hold.listingId,
        count: 0,
      };
      entry.count++;
      paidOut.set(key, entry);
    }
    for (const { hostId, listingId, count } of paidOut.values()) {
      const listing = await ctx.db.get(listingId);
      await notify(ctx, {
        userId: hostId,
        kind: "credit_paid_out",
        listingId,
        data: {
          count,
          ...(listing ? { college: listing.college, dateTime: listing.dateTime } : {}),
        },
      });
    }
    // A settled seat is a completed formal, for the guest and the host.
    const completed = new Set<Id<"users">>();
    for (const hold of due) {
      completed.add(hold.seatHolderId);
      completed.add(hold.hostId);
    }
    for (const userId of completed) {
      await maybeEarnReferral(ctx, userId);
    }
    if (due.length === 200) {
      await ctx.scheduler.runAfter(0, internal.credits.settleDueHolds, {});
    }
    return { paid: due.length };
  },
});

/** Admin: settle a disputed hold either way. */
export const resolveDispute = internalMutation({
  args: {
    holdId: v.id("creditHolds"),
    outcome: v.union(v.literal("payHost"), v.literal("refund")),
  },
  returns: v.null(),
  handler: async (ctx, { holdId, outcome }) => {
    const hold = await ctx.db.get(holdId);
    if (!hold || hold.status !== "disputed") return null;
    if (outcome === "refund") {
      await refundHold(ctx, hold);
    } else {
      await ctx.db.patch(hold._id, { status: "paid", resolvedAt: Date.now() });
      await adjustCredits(ctx, hold.hostId, 1);
    }
    return null;
  },
});
