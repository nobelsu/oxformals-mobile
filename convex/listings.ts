import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { groupSizeValidator } from "./groupSize";
import {
  countReservedSwapsForOffering,
  declinePendingRequestsForListing,
  deleteMenuPdfIfPresent,
  enrichListing,
  expireListing,
  listingIsPast,
  OFFERING_NO_SWAP_CAPACITY_MESSAGE,
  resolveStatusAfterEdit,
  validateMenuPdfId,
} from "./listingHelpers";

type Ctx = QueryCtx | MutationCtx;

const listingTypeValidator = v.union(
  v.literal("swap"),
  v.literal("pay"),
  v.literal("both"),
);

const requestTypeValidator = v.union(v.literal("swap"), v.literal("pay"));

const menuPdfIdOrClear = v.optional(v.union(v.id("_storage"), v.null()));

function resolveListingType(
  listing: Doc<"listings">,
): "swap" | "pay" | "both" {
  return listing.listingType ?? "swap";
}

function resolveRequestType(req: Doc<"requests">): "swap" | "pay" {
  return req.requestType ?? (req.offeringListingId !== undefined ? "swap" : "pay");
}

function validateListingTypeAndPrice(
  listingType: "swap" | "pay" | "both",
  price: number | undefined,
): void {
  if (listingType === "swap") {
    if (price !== undefined) {
      throw new Error("Swap listings cannot have a price.");
    }
    return;
  }
  if (price === undefined || !Number.isInteger(price) || price < 1) {
    throw new Error("Enter a whole number of pounds (at least £1).");
  }
}

function listingAllowsRequestType(
  listingType: "swap" | "pay" | "both",
  requestType: "swap" | "pay",
): boolean {
  if (listingType === "both") return true;
  return listingType === requestType;
}

function listingSupportsSwap(
  listingType: "swap" | "pay" | "both",
): boolean {
  return listingType === "swap" || listingType === "both";
}

async function requireUserId(ctx: Ctx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

async function getListingOrThrow(
  ctx: Ctx,
  listingId: Id<"listings">,
): Promise<Doc<"listings">> {
  const listing = await ctx.db.get(listingId);
  if (!listing) throw new Error("Listing not found");
  return listing;
}

export const listListings = query({
  args: {},
  handler: async (ctx) => {
    const listings = await ctx.db.query("listings").order("desc").take(200);
    return Promise.all(listings.map((listing) => enrichListing(ctx, listing)));
  },
});

export const listMyListings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const listings = await ctx.db
      .query("listings")
      .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", userId))
      .order("desc")
      .take(200);
    return Promise.all(listings.map((listing) => enrichListing(ctx, listing)));
  },
});

export const listRequestsForMe = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("requests")
      .withIndex("by_toUserId", (q) => q.eq("toUserId", userId))
      .order("desc")
      .take(200);
  },
});

export const listRequestsFromMe = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("requests")
      .withIndex("by_fromUserId", (q) => q.eq("fromUserId", userId))
      .order("desc")
      .take(200);
  },
});

export const createListing = mutation({
  args: {
    dateTime: v.string(),
    groupSize: groupSizeValidator,
    message: v.string(),
    menu: v.optional(v.string()),
    menuPdfId: v.optional(v.id("_storage")),
    listingType: listingTypeValidator,
    price: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User profile not found");

    const college = user.college?.trim() ?? "";
    const year = user.year?.trim() ?? "";
    const role = user.role?.trim() ?? "";
    if (!college || !year || !role) {
      throw new Error("Set college, year, and role in your profile before posting.");
    }

    const timestamp = Date.parse(args.dateTime);
    if (Number.isNaN(timestamp)) {
      throw new Error("Invalid listing date.");
    }

    validateListingTypeAndPrice(args.listingType, args.price);

    if (args.menuPdfId !== undefined) {
      await validateMenuPdfId(ctx, args.menuPdfId);
    }

    const listingId = await ctx.db.insert("listings", {
      ownerUserId: userId,
      college,
      dateTime: new Date(timestamp).toISOString(),
      groupSize: args.groupSize,
      seatsAvailable: args.groupSize - 1,
      members: [userId],
      year,
      role,
      message: args.message.trim(),
      menu: (args.menu ?? "").trim(),
      status: "active",
      listingType: args.listingType,
      ...(args.menuPdfId !== undefined ? { menuPdfId: args.menuPdfId } : {}),
      ...(args.listingType === "swap"
        ? {}
        : { price: args.price }),
    });

    await ctx.scheduler.runAfter(0, internal.emails.notifyWishlistForNewListing, {
      listingId,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.pushNotifications.sendWishlistListingPush,
      { listingId },
    );

    return listingId;
  },
});

export const createRequest = mutation({
  args: {
    requestType: requestTypeValidator,
    targetListingId: v.id("listings"),
    offeringListingId: v.optional(v.id("listings")),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const target = await getListingOrThrow(ctx, args.targetListingId);
    const targetType = resolveListingType(target);

    if (target.status !== "active") {
      throw new Error("This listing is no longer active.");
    }
    if (listingIsPast(target.dateTime, Date.now())) {
      throw new Error("This formal has passed.");
    }
    if (target.ownerUserId === userId) {
      throw new Error("You cannot request your own listing.");
    }
    if (!listingAllowsRequestType(targetType, args.requestType)) {
      throw new Error("This listing does not accept that type of request.");
    }

    const mine = await ctx.db
      .query("requests")
      .withIndex("by_fromUserId", (q) => q.eq("fromUserId", userId))
      .take(200);

    const blockingForTarget = mine.find(
      (item) =>
        item.targetListingId === args.targetListingId &&
        (item.status === "pending" || item.status === "accepted"),
    );
    if (blockingForTarget) {
      throw new Error(
        blockingForTarget.status === "accepted"
          ? "You already have an accepted request for this listing. You cannot send another."
          : "You already have a request waiting for a reply on this listing. Withdraw it before sending another.",
      );
    }

    if (args.requestType === "pay") {
      if (args.offeringListingId !== undefined) {
        throw new Error("Pay requests cannot include an offering listing.");
      }

      const existingPay = mine.find(
        (item) =>
          item.targetListingId === args.targetListingId &&
          resolveRequestType(item) === "pay" &&
          item.status === "pending",
      );
      if (existingPay) {
        throw new Error("You already sent this request.");
      }

      const requestId = await ctx.db.insert("requests", {
        fromUserId: userId,
        toUserId: target.ownerUserId,
        targetListingId: args.targetListingId,
        requestType: "pay",
        message: args.message.trim(),
        status: "pending",
      });

      await ctx.scheduler.runAfter(0, internal.emails.sendNewRequestEmail, {
        requestId,
      });

      return { requestId, autoAccepted: false as const };
    }

    if (!args.offeringListingId) {
      throw new Error("Swap requests must include an offering listing.");
    }
    if (args.targetListingId === args.offeringListingId) {
      throw new Error("You must offer a different listing.");
    }

    const offering = await getListingOrThrow(ctx, args.offeringListingId);
    if (offering.status !== "active") {
      throw new Error("Your offering listing must be active.");
    }
    if (listingIsPast(offering.dateTime, Date.now())) {
      throw new Error("Your offering formal has passed.");
    }
    if (offering.ownerUserId !== userId) {
      throw new Error("You can only offer your own listing.");
    }
    if (!listingSupportsSwap(resolveListingType(offering))) {
      throw new Error("Pay listings cannot be used in a swap.");
    }
    if (offering.seatsAvailable <= 0) {
      throw new Error(OFFERING_NO_SWAP_CAPACITY_MESSAGE);
    }
    const reservedForOffering = countReservedSwapsForOffering(
      mine,
      args.offeringListingId,
    );
    if (reservedForOffering >= offering.seatsAvailable) {
      throw new Error(OFFERING_NO_SWAP_CAPACITY_MESSAGE);
    }

    const existingSwap = mine.find(
      (item) =>
        item.targetListingId === args.targetListingId &&
        item.offeringListingId === args.offeringListingId &&
        resolveRequestType(item) === "swap" &&
        item.status === "pending",
    );
    if (existingSwap) {
      throw new Error("You already sent this request.");
    }

    const requestId = await ctx.db.insert("requests", {
      fromUserId: userId,
      toUserId: target.ownerUserId,
      targetListingId: args.targetListingId,
      offeringListingId: args.offeringListingId,
      requestType: "swap",
      message: args.message.trim(),
      status: "pending",
    });

    await ctx.scheduler.runAfter(0, internal.emails.sendNewRequestEmail, {
      requestId,
    });

    const mirrorCandidates = await ctx.db
      .query("requests")
      .withIndex("by_targetListingId_and_status", (q) =>
        q
          .eq("targetListingId", args.offeringListingId!)
          .eq("status", "pending"),
      )
      .take(200);
    const mirror = mirrorCandidates.find(
      (r) =>
        resolveRequestType(r) === "swap" &&
        r.offeringListingId === args.targetListingId &&
        r._id !== requestId,
    );

    if (mirror) {
      await performAccept(ctx, mirror, [requestId]);
      await ctx.db.patch(requestId, { status: "accepted" });
      return { requestId, autoAccepted: true as const };
    }

    return { requestId, autoAccepted: false as const };
  },
});

export const declineRequest = mutation({
  args: { requestId: v.id("requests") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const req = await ctx.db.get(args.requestId);
    if (!req) throw new Error("Request not found");
    if (req.toUserId !== userId) throw new Error("Not allowed");
    if (req.status !== "pending") throw new Error("Request is no longer pending");

    await ctx.db.patch(req._id, { status: "declined" });
    return req._id;
  },
});

export const withdrawRequest = mutation({
  args: { requestId: v.id("requests") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const req = await ctx.db.get(args.requestId);
    if (!req) throw new Error("Request not found");
    if (req.fromUserId !== userId) throw new Error("Not allowed");
    if (req.status !== "pending") throw new Error("Request is no longer pending");

    await ctx.db.delete(req._id);
    return req._id;
  },
});

async function performAccept(
  ctx: MutationCtx,
  req: Doc<"requests">,
  skipIds: Id<"requests">[] = [],
) {
  const requestType = resolveRequestType(req);
  const target = await getListingOrThrow(ctx, req.targetListingId);

  if (target.status !== "active") {
    throw new Error("Target listing is no longer active.");
  }
  if (listingIsPast(target.dateTime, Date.now())) {
    throw new Error("This formal has passed.");
  }
  if (target.seatsAvailable <= 0) {
    throw new Error("No seats available on target listing.");
  }

  await ctx.db.patch(req._id, { status: "accepted" });

  const newSeats = target.seatsAvailable - 1;
  const newMembers = [...target.members, req.fromUserId];
  await ctx.db.patch(req.targetListingId, {
    seatsAvailable: newSeats,
    members: newMembers,
    ...(newSeats === 0 ? { status: "closed" as const } : {}),
  });

  const idsToSkip = new Set([req._id, ...skipIds]);

  if (newSeats === 0) {
    const pendingForTarget = await ctx.db
      .query("requests")
      .withIndex("by_targetListingId_and_status", (q) =>
        q.eq("targetListingId", req.targetListingId).eq("status", "pending"),
      )
      .take(200);
    for (const pending of pendingForTarget) {
      if (idsToSkip.has(pending._id)) continue;
      await ctx.db.patch(pending._id, { status: "declined" });
    }
  }

  if (requestType === "pay") {
    return;
  }

  if (!req.offeringListingId) {
    throw new Error("Swap request is missing an offering listing.");
  }

  const offering = await getListingOrThrow(ctx, req.offeringListingId);
  if (offering.status !== "active") {
    throw new Error("Offering listing is no longer active.");
  }
  if (listingIsPast(offering.dateTime, Date.now())) {
    throw new Error("This formal has passed.");
  }
  if (offering.seatsAvailable <= 0) {
    throw new Error("No seats available on offering listing.");
  }

  const newOfferingSeats = offering.seatsAvailable - 1;
  const newOfferingMembers = [...offering.members, req.toUserId];
  await ctx.db.patch(req.offeringListingId, {
    seatsAvailable: newOfferingSeats,
    members: newOfferingMembers,
    ...(newOfferingSeats === 0 ? { status: "confirmed" as const } : {}),
  });

  if (newOfferingSeats === 0) {
    const pendingForOffering = await ctx.db
      .query("requests")
      .withIndex("by_offeringListingId_and_status", (q) =>
        q.eq("offeringListingId", req.offeringListingId!).eq("status", "pending"),
      )
      .take(200);
    for (const pending of pendingForOffering) {
      if (idsToSkip.has(pending._id)) continue;
      await ctx.db.patch(pending._id, { status: "declined" });
    }
  }
}

export const acceptRequest = mutation({
  args: { requestId: v.id("requests") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const req = await ctx.db.get(args.requestId);
    if (!req) throw new Error("Request not found");
    if (req.toUserId !== userId) throw new Error("Not allowed");
    if (req.status !== "pending") throw new Error("Request is no longer pending");

    await performAccept(ctx, req);

    return req._id;
  },
});

export const leaveGroup = mutation({
  args: { listingId: v.id("listings") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const listing = await getListingOrThrow(ctx, args.listingId);

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
    await ctx.db.patch(args.listingId, {
      members: newMembers,
      seatsAvailable: newSeats,
      ...(reopened ? { status: "active" as const } : {}),
    });

    const acceptedRequests = await ctx.db
      .query("requests")
      .withIndex("by_targetListingId_and_status", (q) =>
        q.eq("targetListingId", args.listingId).eq("status", "accepted"),
      )
      .take(200);
    for (const req of acceptedRequests) {
      if (req.fromUserId === userId) {
        await ctx.db.patch(req._id, { status: "declined" });
      }
    }

    return args.listingId;
  },
});

export const removeMember = mutation({
  args: { listingId: v.id("listings"), memberId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const listing = await getListingOrThrow(ctx, args.listingId);

    if (listing.ownerUserId !== userId) {
      throw new Error("Only the owner can remove members.");
    }
    if (args.memberId === userId) {
      throw new Error("The owner cannot remove themselves.");
    }
    if (!listing.members.includes(args.memberId)) {
      throw new Error("User is not a member of this group.");
    }

    const newMembers = listing.members.filter((m) => m !== args.memberId);
    const newSeats = listing.seatsAvailable + 1;
    const nowMs = Date.now();
    const reopened =
      listing.status === "closed" &&
      newSeats > 0 &&
      !listingIsPast(listing.dateTime, nowMs);
    await ctx.db.patch(args.listingId, {
      members: newMembers,
      seatsAvailable: newSeats,
      ...(reopened ? { status: "active" as const } : {}),
    });

    const acceptedRequests = await ctx.db
      .query("requests")
      .withIndex("by_targetListingId_and_status", (q) =>
        q.eq("targetListingId", args.listingId).eq("status", "accepted"),
      )
      .take(200);
    for (const req of acceptedRequests) {
      if (req.fromUserId === args.memberId) {
        await ctx.db.patch(req._id, { status: "declined" });
      }
    }

    return args.listingId;
  },
});

export const updateListing = mutation({
  args: {
    listingId: v.id("listings"),
    dateTime: v.optional(v.string()),
    groupSize: v.optional(groupSizeValidator),
    message: v.optional(v.string()),
    menu: v.optional(v.string()),
    menuPdfId: menuPdfIdOrClear,
    listingType: v.optional(listingTypeValidator),
    price: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const listing = await getListingOrThrow(ctx, args.listingId);

    if (listing.ownerUserId !== userId) {
      throw new Error("Only the owner can edit a listing.");
    }

    const pendingOnListing = await ctx.db
      .query("requests")
      .withIndex("by_targetListingId_and_status", (q) =>
        q.eq("targetListingId", args.listingId).eq("status", "pending"),
      )
      .take(1);
    if (pendingOnListing.length > 0) {
      throw new Error(
        "Cannot edit listing while there are pending requests.",
      );
    }

    const patch: Partial<Doc<"listings">> = {};

    if (args.dateTime !== undefined) {
      const timestamp = Date.parse(args.dateTime);
      if (Number.isNaN(timestamp)) {
        throw new Error("Invalid listing date.");
      }
      patch.dateTime = new Date(timestamp).toISOString();
    }

    if (args.groupSize !== undefined) {
      if (args.groupSize < listing.members.length) {
        throw new Error(
          "Group size cannot be less than the current number of members.",
        );
      }
      patch.groupSize = args.groupSize;
      patch.seatsAvailable = args.groupSize - listing.members.length;
    }

    if (args.message !== undefined) {
      patch.message = args.message.trim();
    }

    if (args.menu !== undefined) {
      patch.menu = args.menu.trim();
    }

    if (args.menuPdfId !== undefined) {
      if (args.menuPdfId === null) {
        if (listing.menuPdfId) {
          await deleteMenuPdfIfPresent(ctx, listing.menuPdfId);
        }
        patch.menuPdfId = undefined;
      } else {
        await validateMenuPdfId(ctx, args.menuPdfId);
        if (listing.menuPdfId && listing.menuPdfId !== args.menuPdfId) {
          await deleteMenuPdfIfPresent(ctx, listing.menuPdfId);
        }
        patch.menuPdfId = args.menuPdfId;
      }
    }

    if (args.listingType !== undefined || args.price !== undefined) {
      const nextType = args.listingType ?? resolveListingType(listing);
      const nextPrice =
        args.price !== undefined
          ? args.price
          : nextType === "swap"
            ? undefined
            : listing.price;
      validateListingTypeAndPrice(nextType, nextPrice);
      patch.listingType = nextType;
      if (nextType === "swap") {
        patch.price = undefined;
      } else {
        patch.price = nextPrice;
      }
    }

    const finalDateTime = patch.dateTime ?? listing.dateTime;
    const finalGroupSize = patch.groupSize ?? listing.groupSize;
    const newStatus = resolveStatusAfterEdit(
      listing,
      finalDateTime,
      finalGroupSize,
      Date.now(),
    );
    if (newStatus !== undefined) {
      patch.status = newStatus;
    }

    const hasMenuPdfChange = args.menuPdfId !== undefined;
    if (Object.keys(patch).length === 0 && !hasMenuPdfChange) {
      return args.listingId;
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.listingId, patch);
    }
    return args.listingId;
  },
});

const EXPIRE_BATCH_SIZE = 100;

async function expirePastListingsBatch(
  ctx: MutationCtx,
  cursor?: string,
): Promise<{ expired: number; scanned: number; isDone: boolean; continueCursor: string }> {
  const nowMs = Date.now();
  const result = await ctx.db
    .query("listings")
    .withIndex("by_status", (q) => q.eq("status", "active"))
    .paginate({
      numItems: EXPIRE_BATCH_SIZE,
      cursor: cursor ?? null,
    });

  let expired = 0;
  for (const listing of result.page) {
    if (listingIsPast(listing.dateTime, nowMs)) {
      await expireListing(ctx, listing._id);
      expired++;
    }
  }

  return {
    expired,
    scanned: result.page.length,
    isDone: result.isDone,
    continueCursor: result.continueCursor,
  };
}

export const expirePastListings = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const batch = await expirePastListingsBatch(ctx, args.cursor);

    if (!batch.isDone) {
      await ctx.scheduler.runAfter(0, internal.listings.expirePastListings, {
        cursor: batch.continueCursor,
      });
    }

    return { expired: batch.expired, scanned: batch.scanned };
  },
});

export const syncExpiredListings = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx);

    let totalExpired = 0;
    let totalScanned = 0;
    let cursor: string | undefined;

    for (;;) {
      const batch = await expirePastListingsBatch(ctx, cursor);
      totalExpired += batch.expired;
      totalScanned += batch.scanned;
      if (batch.isDone) break;
      cursor = batch.continueCursor;
    }

    return { expired: totalExpired, scanned: totalScanned };
  },
});

export const backfillMenu = internalMutation({
  args: {},
  handler: async (ctx) => {
    const listings = await ctx.db.query("listings").take(1000);
    let patched = 0;
    for (const listing of listings) {
      if (listing.menu === undefined) {
        await ctx.db.patch(listing._id, { menu: "" });
        patched++;
      }
    }
    return { patched, total: listings.length };
  },
});

export const backfillListingTypeSwap = internalMutation({
  args: {},
  handler: async (ctx) => {
    const listings = await ctx.db.query("listings").take(100);
    let patched = 0;
    for (const listing of listings) {
      if (listing.listingType !== "swap") {
        await ctx.db.patch(listing._id, { listingType: "swap" });
        patched++;
      }
    }
    if (listings.length === 100) {
      await ctx.scheduler.runAfter(
        0,
        internal.listings.backfillListingTypeSwap,
        {},
      );
    }
    return { patched, scanned: listings.length };
  },
});

export const backfillListingAndRequestTypes = internalMutation({
  args: {},
  handler: async (ctx) => {
    const listings = await ctx.db.query("listings").take(1000);
    let listingsPatched = 0;
    for (const listing of listings) {
      if (listing.listingType === undefined) {
        await ctx.db.patch(listing._id, { listingType: "swap" });
        listingsPatched++;
      }
    }

    const requests = await ctx.db.query("requests").take(1000);
    let requestsPatched = 0;
    for (const req of requests) {
      if (req.requestType === undefined) {
        const requestType =
          req.offeringListingId !== undefined ? "swap" : "pay";
        await ctx.db.patch(req._id, { requestType });
        requestsPatched++;
      }
    }

    return {
      listingsPatched,
      listingsTotal: listings.length,
      requestsPatched,
      requestsTotal: requests.length,
    };
  },
});

export const deleteListing = mutation({
  args: { listingId: v.id("listings") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const listing = await getListingOrThrow(ctx, args.listingId);

    if (listing.ownerUserId !== userId) {
      throw new Error("Only the owner can delete a listing.");
    }

    await declinePendingRequestsForListing(ctx, args.listingId);

    await deleteMenuPdfIfPresent(ctx, listing.menuPdfId);
    await ctx.db.delete(args.listingId);
    return args.listingId;
  },
});
