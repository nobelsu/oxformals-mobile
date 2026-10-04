import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { adjustCredits } from "./credits";
import { listingIsPast } from "./listingHelpers";
import { notify } from "./notify";

/**
 * Who brought whom onto Oxformals. Recorded when a new account claims an
 * invite or seat link; pays the inviter a credit after the invitee's first
 * completed formal (see maybeEarnReferral).
 */

/** Records the referral unless the invitee already has one. */
export async function recordReferral(
  ctx: MutationCtx,
  args: { inviterId: Id<"users">; inviteeId: Id<"users">; source: "link" | "seat" },
): Promise<boolean> {
  if (args.inviterId === args.inviteeId) return false;
  const existing = await ctx.db
    .query("referrals")
    .withIndex("by_inviteeId", (q) => q.eq("inviteeId", args.inviteeId))
    .first();
  if (existing) return false;
  await ctx.db.insert("referrals", { ...args, status: "pending", createdAt: Date.now() });
  return true;
}

/** Most invites that pay a credit, per inviter. */
export const REFERRAL_CAP = 5;

/**
 * The invitee just completed a formal. If it's their first (their referral is
 * still pending), the inviter earns a credit — unless they've had five.
 */
export async function maybeEarnReferral(
  ctx: MutationCtx,
  inviteeId: Id<"users">,
): Promise<void> {
  const referral = await ctx.db
    .query("referrals")
    .withIndex("by_inviteeId", (q) => q.eq("inviteeId", inviteeId))
    .first();
  if (!referral || referral.status !== "pending") return;
  const inviter = await ctx.db.get(referral.inviterId);
  const earned = await ctx.db
    .query("referrals")
    .withIndex("by_inviterId_and_status", (q) =>
      q.eq("inviterId", referral.inviterId).eq("status", "earned"),
    )
    .take(REFERRAL_CAP);
  if (!inviter || inviter.deletedAt !== undefined || earned.length >= REFERRAL_CAP) {
    await ctx.db.patch(referral._id, { status: "void" });
    return;
  }
  await ctx.db.patch(referral._id, { status: "earned" });
  await adjustCredits(ctx, referral.inviterId, 1);
  await notify(ctx, {
    userId: referral.inviterId,
    kind: "credit_earned",
    actorId: inviteeId,
    data: { reason: "referral", count: 1 },
  });
}

/**
 * A guest confirmed they attended. Seats paid by credit count when their hold
 * settles instead (so a dispute can stop it); nothing counts if anyone said
 * the formal didn't happen.
 */
export async function earnReferralOnAttendance(
  ctx: MutationCtx,
  listingId: Id<"listings">,
  userId: Id<"users">,
): Promise<void> {
  const holds = await ctx.db
    .query("creditHolds")
    .withIndex("by_listingId", (q) => q.eq("listingId", listingId))
    .take(100);
  const listing = await ctx.db.get(listingId);
  if (!listing || !listingIsPast(listing.dateTime, Date.now())) return;
  if (holds.some((h) => h.status === "disputed")) return;
  if (holds.some((h) => h.seatHolderId === userId)) return;
  await maybeEarnReferral(ctx, userId);
}
