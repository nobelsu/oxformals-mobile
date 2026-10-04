import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { listingIsPast } from "./listingHelpers";
import { detachMember } from "./listingMembership";
import { notify } from "./notify";

/**
 * A swap is one accepted request with an `offeringListingId`:
 *   requester A joins the target listing (hosted by B), and
 *   B joins the offering listing (hosted by A).
 * The two seats stand or fall together — nobody keeps their half of a swap
 * after taking the other half away.
 */

export type FormalNotice = {
  userId: Id<"users">;
  subject: string;
  body: string;
  /** Where the email's button goes: your formals, browse, or the feed (invites). */
  cta: "formals" | "browse" | "invites";
  /** Small label above the email's headline. */
  eyebrow?: string;
  /** The formal the email shows as a ticket. */
  listingId?: Id<"listings">;
};

function isSwap(req: Doc<"requests">): boolean {
  return req.offeringListingId !== undefined && req.requestType !== "pay";
}

/** Accepted swaps touching a listing, from either side. */
export async function acceptedSwapsForListing(
  ctx: MutationCtx,
  listingId: Id<"listings">,
): Promise<Doc<"requests">[]> {
  const asTarget = await ctx.db
    .query("requests")
    .withIndex("by_targetListingId_and_status", (q) =>
      q.eq("targetListingId", listingId).eq("status", "accepted"),
    )
    .take(200);
  const asOffering = await ctx.db
    .query("requests")
    .withIndex("by_offeringListingId_and_status", (q) =>
      q.eq("offeringListingId", listingId).eq("status", "accepted"),
    )
    .take(200);
  return [...asTarget, ...asOffering].filter(isSwap);
}

/**
 * The accepted swap that seated `memberId` on `listingId`, if any: either they
 * requested this listing (target), or they're the host who got a seat here in
 * return (offering).
 */
export async function swapSeatingMember(
  ctx: MutationCtx,
  listingId: Id<"listings">,
  memberId: Id<"users">,
): Promise<Doc<"requests"> | null> {
  const swaps = await acceptedSwapsForListing(ctx, listingId);
  return (
    swaps.find(
      (r) =>
        (r.targetListingId === listingId && r.fromUserId === memberId) ||
        (r.offeringListingId === listingId && r.toUserId === memberId),
    ) ?? null
  );
}

/**
 * The host of `brokenListingId` took their swap partner's seat away (removed
 * them, or cancelled the formal), so they lose their own seat on the other
 * listing too. When the other formal has already happened there's nothing to
 * take back: the break is recorded and the team is emailed.
 *
 * A guest who *leaves* isn't breaking anything — they only give up their own
 * half — so leaving never calls this.
 */
export async function undoSwap(
  ctx: MutationCtx,
  req: Doc<"requests">,
  brokenListingId: Id<"listings">,
): Promise<void> {
  if (!req.offeringListingId) return;
  await ctx.db.patch(req._id, { status: "declined" });

  const brokeTarget = brokenListingId === req.targetListingId;
  // The other listing, and the seat its breaker holds there.
  const otherListingId = brokeTarget ? req.offeringListingId : req.targetListingId;
  const brokenByUserId = brokeTarget ? req.toUserId : req.fromUserId;
  // The person who lost their seat on the broken listing.
  const wrongedUserId = brokeTarget ? req.fromUserId : req.toUserId;

  const other = await ctx.db.get(otherListingId);
  if (!other || !other.members.includes(brokenByUserId)) return;

  if (listingIsPast(other.dateTime, Date.now())) {
    await ctx.db.insert("swapBreaks", {
      requestId: req._id,
      brokenByUserId,
      wrongedUserId,
      listingId: otherListingId,
      createdAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.emails.sendSwapBreakReport, {
      requestId: req._id,
      brokenByUserId,
      wrongedUserId,
    });
    return;
  }

  await detachMember(ctx, otherListingId, brokenByUserId);
  await notify(ctx, {
    userId: brokenByUserId,
    kind: "swap_undone",
    actorId: wrongedUserId,
    listingId: otherListingId,
    requestId: req._id,
    data: { college: other.college, dateTime: other.dateTime },
  });
}

/** Undo every swap tied to a listing that is being cancelled. */
export async function undoSwapsForCancelledListing(
  ctx: MutationCtx,
  listing: Doc<"listings">,
): Promise<void> {
  const swaps = await acceptedSwapsForListing(ctx, listing._id);
  for (const req of swaps) {
    await undoSwap(ctx, req, listing._id);
  }
}

export async function sendFormalNotices(
  ctx: MutationCtx,
  notices: FormalNotice[],
): Promise<void> {
  if (notices.length === 0) return;
  await ctx.scheduler.runAfter(0, internal.emails.sendFormalNotices, {
    notices,
  });
}
