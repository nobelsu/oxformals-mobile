import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { syncListingAttendanceGuests } from "./collegeStats";
import { refundSeatHolderCredits } from "./credits";
import { listingIsPast } from "./listingHelpers";
import { guestsBroughtBy, withGuestSeats } from "./seats";

/**
 * Take a guest's seat back on a listing: drop them from `members`, free the
 * seat, and reopen a full upcoming listing. Returns false when they weren't a
 * guest there (or the listing is gone). No request bookkeeping — callers
 * decide what happened to the request that seated them.
 */
export async function detachMember(
  ctx: MutationCtx,
  listingId: Id<"listings">,
  userId: Id<"users">,
): Promise<boolean> {
  const listing = await ctx.db.get(listingId);
  if (!listing) return false;
  if (listing.ownerUserId === userId) return false;
  if (!listing.members.includes(userId)) return false;

  // Their unnamed guests leave with them.
  const theirGuests = guestsBroughtBy(listing, userId);
  const newMembers = listing.members.filter((m) => m !== userId);
  const nowMs = Date.now();
  const newSeats = listing.seatsAvailable + 1 + theirGuests;
  const reopened =
    (listing.status === "closed" || listing.status === "confirmed") &&
    newSeats > 0 &&
    !listingIsPast(listing.dateTime, nowMs);
  await ctx.db.patch(listingId, {
    members: newMembers,
    seatsAvailable: newSeats,
    ...(theirGuests > 0
      ? { guestSeats: withGuestSeats(listing.guestSeats, userId, -theirGuests) }
      : {}),
    ...(reopened ? { status: "active" as const } : {}),
  });

  const updated = await ctx.db.get(listingId);
  if (updated) {
    await syncListingAttendanceGuests(ctx, updated, nowMs);
  }
  await refundSeatHolderCredits(ctx, listing, userId);
  return true;
}

/** Remove a guest from a listing group and decline their accepted request. */
export async function removeUserFromListingGroup(
  ctx: MutationCtx,
  listingId: Id<"listings">,
  userId: Id<"users">,
): Promise<Id<"listings">> {
  const listing = await ctx.db.get(listingId);
  if (!listing) throw new Error("Listing not found.");

  if (listing.ownerUserId === userId) {
    throw new Error("The owner cannot leave their own group.");
  }
  if (!listing.members.includes(userId)) {
    throw new Error("You are not a member of this group.");
  }

  await detachMember(ctx, listingId, userId);

  const acceptedRequests = await ctx.db
    .query("requests")
    .withIndex("by_targetListingId_and_status", (q) =>
      q.eq("targetListingId", listingId).eq("status", "accepted"),
    )
    .take(200);
  for (const req of acceptedRequests) {
    if (req.fromUserId === userId) {
      await ctx.db.patch(req._id, { status: "declined" });
    }
  }

  return listingId;
}
