import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { syncListingAttendanceGuests } from "./collegeStats";
import { listingIsPast } from "./listingHelpers";

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

  const newMembers = listing.members.filter((m) => m !== userId);
  const newSeats = listing.seatsAvailable + 1;
  const nowMs = Date.now();
  const reopened =
    listing.status === "closed" &&
    newSeats > 0 &&
    !listingIsPast(listing.dateTime, nowMs);
  await ctx.db.patch(listingId, {
    members: newMembers,
    seatsAvailable: newSeats,
    ...(reopened ? { status: "active" as const } : {}),
  });

  const updated = await ctx.db.get(listingId);
  if (updated) {
    await syncListingAttendanceGuests(ctx, updated, nowMs);
  }

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
