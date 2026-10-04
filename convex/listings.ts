import { getAuthUserId } from "@convex-dev/auth/server";
import { blockedEitherWay, blockedIdsFor } from "./blocks";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { groupSizeValidator } from "./groupSize";
import {
  applyCompletedFormalForListing,
  scheduleFormalCompletion,
  syncListingAttendanceGuests,
} from "./collegeStats";
import { detachMember, removeUserFromListingGroup } from "./listingMembership";
import {
  creditBalance,
  holdSeatCredits,
  refundListingCredits,
  refundSeatHolderCredits,
} from "./credits";
import { areFriends } from "./follows";
import { notify } from "./notify";
import { newSeatToken, SEAT_LINK_TTL_MS } from "./seatLinks";
import {
  countByMethod,
  guestsBroughtBy,
  MAX_GUESTS,
  occupiedSeats,
  requestSeats,
  seatMethodValidator,
  unclaimedLinkSeats,
  withGuestSeats,
  type Seat,
} from "./seats";
import {
  sendFormalNotices,
  swapSeatingMember,
  undoSwap,
  undoSwapsForCancelledListing,
  type FormalNotice,
} from "./swapLinks";
import { normalizeCollegeName } from "../lib/data/colleges";
import { roleNeedsYear } from "./roles";
import {
  declinePendingRequestsForListing,
  deleteMenuPdfIfPresent,
  enrichListing,
  expireListing,
  listingIsPast,
  resolveStatusAfterEdit,
  validateMenuPdfId,
} from "./listingHelpers";
import {
  optionalUserId,
  requireActiveUser,
  sanitizeLimitedUser,
  sanitizePublicUser,
} from "./guards";

/** A listing host as signed-out visitors see them: private accounts limited. */
function signedOutHostSummary(user: Doc<"users">) {
  return user.isPrivate === true
    ? sanitizeLimitedUser(user)
    : sanitizePublicUser(user);
}

type Ctx = QueryCtx | MutationCtx;

const listingTypeValidator = v.union(
  v.literal("swap"),
  v.literal("pay"),
  v.literal("both"),
);

const formalTypeValidator = v.union(
  v.literal("matchmaking"),
  v.literal("social"),
  v.literal("networking"),
);

const requestTypeValidator = v.union(
  v.literal("swap"),
  v.literal("pay"),
  v.literal("credit"),
);

const menuPdfIdOrClear = v.optional(v.union(v.id("_storage"), v.null()));

const listingStatusValidator = v.union(
  v.literal("active"),
  v.literal("confirmed"),
  v.literal("closed"),
  v.literal("expired"),
);

const enrichedListingValidator = v.object({
  _id: v.id("listings"),
  _creationTime: v.number(),
  ownerUserId: v.id("users"),
  college: v.string(),
  dateTime: v.string(),
  groupSize: groupSizeValidator,
  seatsAvailable: v.number(),
  members: v.array(v.id("users")),
  year: v.string(),
  role: v.string(),
  message: v.string(),
  menu: v.optional(v.string()),
  menuPdfId: v.optional(v.id("_storage")),
  status: listingStatusValidator,
  listingType: v.optional(listingTypeValidator),
  price: v.optional(v.number()),
  attendanceAppliedAt: v.optional(v.number()),
  attendanceGuestCount: v.optional(v.number()),
  formalType: v.optional(formalTypeValidator),
  guestSeats: v.optional(
    v.array(v.object({ userId: v.id("users"), count: v.number() })),
  ),
  menuPdfUrl: v.union(v.string(), v.null()),
  menuFileContentType: v.union(v.string(), v.null()),
});

function resolveListingType(
  listing: Doc<"listings">,
): "swap" | "pay" | "both" {
  return listing.listingType ?? "swap";
}

function resolveRequestType(req: Doc<"requests">): "swap" | "pay" | "credit" {
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
  requestType: "swap" | "pay" | "credit",
): boolean {
  // Every listing takes credits; that's what makes them worth earning.
  if (requestType === "credit") return true;
  if (listingType === "both") return true;
  return listingType === requestType;
}

function listingSupportsSwap(
  listingType: "swap" | "pay" | "both",
): boolean {
  return listingType === "swap" || listingType === "both";
}

async function requireUserId(ctx: Ctx): Promise<Id<"users">> {
  const { userId } = await requireActiveUser(ctx);
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
    // Hosts you've blocked, or who blocked you, drop out of every listing view.
    const blocked = await blockedIdsFor(ctx, await optionalUserId(ctx));
    return Promise.all(
      listings
        .filter((listing) => !blocked.has(listing.ownerUserId))
        .map((listing) => enrichListing(ctx, listing)),
    );
  },
});

/**
 * Upcoming open formals for the logged-out landing page. Deliberately narrow:
 * the landing page must not pay for `listListings` (200 docs) plus
 * `users.listPublic` (500 docs) to render a handful of rows.
 *
 * Returns each listing joined with its owner's public summary so the hero
 * renders in a single round trip instead of waiting on a second
 * `users.getPublicByIds` query keyed off the first result.
 */
export const listUpcomingPublic = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 5, 1), 20);
    const nowIso = new Date().toISOString();
    // Writes normalise `dateTime` via `new Date(timestamp).toISOString()`
    // (see createListing/updateListing), so every stored value is a
    // uniform UTC ISO string and this range query sorts/filters correctly
    // via plain lexicographic comparison. That invariant isn't enforced by
    // the schema, and this deployment is shared with a sibling repo whose
    // `convex/` has diverged — a row written in another format would
    // silently escape this filter.
    const listings = await ctx.db
      .query("listings")
      .withIndex("by_status_and_dateTime", (q) =>
        q.eq("status", "active").gt("dateTime", nowIso),
      )
      .order("asc")
      .take(limit);
    const enriched = await Promise.all(
      listings.map((listing) => enrichListing(ctx, listing)),
    );

    // Multiple listings can share an owner; look each owner up once.
    const ownerIds = [...new Set(enriched.map((listing) => listing.ownerUserId))];
    const ownerDocs = await Promise.all(ownerIds.map((id) => ctx.db.get(id)));
    const ownersById = new Map(
      ownerDocs
        .filter((user): user is Doc<"users"> => user !== null)
        .map((user) => [user._id, signedOutHostSummary(user)]),
    );

    return enriched.flatMap((listing) => {
      const owner = ownersById.get(listing.ownerUserId);
      return owner ? [{ ...listing, owner }] : [];
    });
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

export const listActiveListingsForCollege = query({
  args: {
    college: v.string(),
  },
  returns: v.array(enrichedListingValidator),
  handler: async (ctx, args) => {
    const college = normalizeCollegeName(args.college);
    const listings = await ctx.db
      .query("listings")
      .withIndex("by_college_and_status", (q) =>
        q.eq("college", college).eq("status", "active"),
      )
      .order("desc")
      .take(50);
    return Promise.all(listings.map((listing) => enrichListing(ctx, listing)));
  },
});

/**
 * Hosts of a college's open formals, for signed-out visitors of the college
 * page (signed-in visitors resolve people through `users.listPublic`).
 */
export const listActiveHostsForCollege = query({
  args: { college: v.string() },
  handler: async (ctx, args) => {
    const college = normalizeCollegeName(args.college);
    const listings = await ctx.db
      .query("listings")
      .withIndex("by_college_and_status", (q) =>
        q.eq("college", college).eq("status", "active"),
      )
      .order("desc")
      .take(50);
    const ownerIds = [...new Set(listings.map((l) => l.ownerUserId))];
    const owners = await Promise.all(ownerIds.map((id) => ctx.db.get(id)));
    return owners
      .filter(
        (user): user is Doc<"users"> =>
          user !== null && user.deletedAt === undefined,
      )
      .map(signedOutHostSummary);
  },
});

/**
 * Hosts of upcoming active listings, for signed-out browsing (the user
 * directory needs sign-in). Private hosts are limited to name, college, year
 * and role.
 */
export const listActiveHosts = query({
  args: {},
  handler: async (ctx) => {
    const listings = await ctx.db
      .query("listings")
      .withIndex("by_status_and_dateTime", (q) =>
        q.eq("status", "active").gt("dateTime", new Date().toISOString()),
      )
      .take(300);
    const ownerIds = [...new Set(listings.map((l) => l.ownerUserId))];
    const owners = await Promise.all(ownerIds.map((id) => ctx.db.get(id)));
    return owners
      .filter(
        (user): user is Doc<"users"> =>
          user !== null && user.deletedAt === undefined,
      )
      .map(signedOutHostSummary);
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
    formalType: v.optional(formalTypeValidator),
    price: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User profile not found");

    const college = user.college?.trim() ?? "";
    const role = user.role?.trim() ?? "";
    const year = roleNeedsYear(role) ? (user.year?.trim() ?? "") : "";
    if (!college || !role || (roleNeedsYear(role) && !year)) {
      throw new Error("Set college, year, and role in your profile before posting.");
    }

    const timestamp = Date.parse(args.dateTime);
    if (Number.isNaN(timestamp)) {
      throw new Error("Invalid listing date.");
    }

    validateListingTypeAndPrice(args.listingType, args.price);

    if (args.menuPdfId !== undefined) {
      await validateMenuPdfId(ctx, args.menuPdfId, userId);
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
      formalType: args.formalType ?? "social",
      ...(args.menuPdfId !== undefined ? { menuPdfId: args.menuPdfId } : {}),
      ...(args.listingType === "swap"
        ? {}
        : { price: args.price }),
    });

    // Everyone who wants to go to this college hears about it (bell, push,
    // and email if "Credits & reminders" email is on).
    const wishers = await ctx.db
      .query("collegeWishlists")
      .withIndex("by_college", (q) => q.eq("college", college))
      .take(500);
    const told = new Set<Id<"users">>();
    for (const w of wishers) {
      if (w.userId === userId || told.has(w.userId)) continue;
      told.add(w.userId);
      await notify(ctx, {
        userId: w.userId,
        kind: "wishlist_listing",
        actorId: userId,
        listingId,
        data: { college, dateTime: new Date(timestamp).toISOString() },
      });
    }

    const listing = await ctx.db.get(listingId);
    if (listing) {
      await scheduleFormalCompletion(ctx, listingId, listing.dateTime);
    }

    return listingId;
  },
});

export const createRequest = mutation({
  args: {
    requestType: requestTypeValidator,
    targetListingId: v.id("listings"),
    offeringListingId: v.optional(v.id("listings")),
    message: v.string(),
    /** Unnamed "+N" guests, paid by the requester. */
    guests: v.optional(v.number()),
    /** How each guest seat is paid; defaults to `requestType` for all. */
    guestMethods: v.optional(v.array(seatMethodValidator)),
    /**
     * Named friends (mutual follows). A friend can pay for their own seat
     * (credit or cash) or the requester can cover it.
     */
    friends: v.optional(
      v.array(
        v.object({
          userId: v.id("users"),
          paysOwn: v.boolean(),
          method: seatMethodValidator,
        }),
      ),
    ),
    /**
     * Seats for people not on Oxformals yet. Each gets a link to claim. They
     * pay with their own credit (`paysOwn`) or the requester covers them.
     */
    links: v.optional(
      v.array(v.object({ paysOwn: v.boolean(), method: seatMethodValidator })),
    ),
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
    if (await blockedEitherWay(ctx, userId, target.ownerUserId)) {
      throw new Error("This listing is no longer available.");
    }

    const guests = args.guests ?? 0;
    const friends = args.friends ?? [];
    const links = args.links ?? [];
    if (
      !Number.isInteger(guests) ||
      guests < 0 ||
      guests + friends.length + links.length > MAX_GUESTS
    ) {
      throw new Error(`You can bring up to ${MAX_GUESTS} people.`);
    }
    for (const l of links) {
      if (l.paysOwn && l.method !== "credit") {
        throw new Error("Someone new can only pay for themselves with a credit.");
      }
    }
    if (args.guestMethods && args.guestMethods.length !== guests) {
      throw new Error("Each guest needs a way to pay.");
    }
    const seen = new Set<string>();
    for (const f of friends) {
      if (f.userId === userId) throw new Error("You're already in your own request.");
      if (f.userId === target.ownerUserId) {
        throw new Error("The host is already going.");
      }
      if (seen.has(f.userId)) throw new Error("You've named someone twice.");
      seen.add(f.userId);
      if (!(await areFriends(ctx, userId, f.userId))) {
        throw new Error("You can only name people you follow who follow you back.");
      }
      if (target.members.includes(f.userId)) {
        const friend = await ctx.db.get(f.userId);
        throw new Error(`${friend?.name?.split(" ")[0] ?? "They"}'re already going.`);
      }
      if (f.paysOwn && f.method === "swap") {
        throw new Error("Friends paying for themselves can use a credit or cash.");
      }
    }
    const now = Date.now();
    const linkTokens: string[] = [];
    for (let i = 0; i < links.length; i++) linkTokens.push(await newSeatToken(ctx));
    const party: NonNullable<Doc<"requests">["party"]> = [
      ...friends.map((f) => ({
        kind: "friend" as const,
        userId: f.userId,
        payerId: f.paysOwn ? f.userId : userId,
        method: f.method,
        response: "pending" as const,
      })),
      ...links.map((l, i) => ({
        kind: "link" as const,
        token: linkTokens[i],
        // The requester until someone claims it (then the claimer, if paysOwn).
        payerId: userId,
        method: l.method,
        paysOwn: l.paysOwn,
        response: "pending" as const,
        expiresAt: now + SEAT_LINK_TTL_MS,
      })),
      ...Array.from({ length: guests }, (_, i) => ({
        kind: "guest" as const,
        payerId: userId,
        method: args.guestMethods?.[i] ?? args.requestType,
      })),
    ];
    const draft = {
      fromUserId: userId,
      requestType: args.requestType,
      party,
    } as Doc<"requests">;
    const seats = requestSeats(draft);

    if (seats.length > target.seatsAvailable) {
      throw new Error(
        target.seatsAvailable === 1
          ? "There's only 1 seat left."
          : `There are only ${target.seatsAvailable} seats left.`,
      );
    }
    for (const seat of seats) {
      if (!listingAllowsRequestType(targetType, seat.method)) {
        throw new Error("This listing does not accept that type of request.");
      }
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

    // My own seat plus every party seat I cover. A link seat the new person
    // pays for isn't mine, even though I'm its placeholder payer.
    const myCreditSeats =
      (args.requestType === "credit" ? 1 : 0) +
      party.filter(
        (p) => p.method === "credit" && p.payerId === userId && p.paysOwn !== true,
      ).length;
    if (myCreditSeats > 0) {
      const balance = await creditBalance(ctx, userId);
      if (balance < myCreditSeats) {
        throw new Error(
          balance === 0
            ? "You don't have any credits. Host a guest at your college's formal to earn one."
            : `That needs ${myCreditSeats} credits and you have ${balance}.`,
        );
      }
    }

    const swapSeats = countByMethod(seats, "swap");
    if (swapSeats > 0) {
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
      if (offering.seatsAvailable < swapSeats) {
        throw new Error(
          `Swapping ${swapSeats} seats needs ${swapSeats} free seats at your formal, and it has ${offering.seatsAvailable}.`,
        );
      }
    } else if (args.offeringListingId !== undefined) {
      throw new Error("Only swap requests include an offering listing.");
    }

    // Two hosts who each asked for the other's formal: the earlier request
    // already describes this swap, so accept it rather than recording a second
    // one. One accepted request per swap keeps the seats linked exactly once.
    // Only for one-for-one swaps; group swaps always need the host to accept.
    if (args.requestType === "swap" && party.length === 0 && args.offeringListingId) {
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
          r.fromUserId === target.ownerUserId &&
          r.offeringListingId === args.targetListingId &&
          (r.party ?? []).length === 0,
      );

      if (mirror) {
        await performAccept(ctx, mirror);
        const theirs = await ctx.db.get(mirror.targetListingId);
        await notify(ctx, {
          userId: mirror.fromUserId,
          kind: "request_accepted",
          actorId: userId,
          listingId: mirror.targetListingId,
          requestId: mirror._id,
          ...(theirs ? { data: { college: theirs.college, dateTime: theirs.dateTime } } : {}),
        });
        return { requestId: mirror._id, autoAccepted: true as const };
      }
    }

    const requestId = await ctx.db.insert("requests", {
      fromUserId: userId,
      toUserId: target.ownerUserId,
      targetListingId: args.targetListingId,
      ...(swapSeats > 0 ? { offeringListingId: args.offeringListingId } : {}),
      requestType: args.requestType,
      message: args.message.trim(),
      status: "pending",
      ...(party.length > 0 ? { party } : {}),
    });

    const formal = { college: target.college, dateTime: target.dateTime };
    // The new-request email is sent by notify's delivery (it obeys prefs).
    await notify(ctx, {
      userId: target.ownerUserId,
      kind: "request_received",
      actorId: userId,
      listingId: target._id,
      requestId,
      data: { ...formal, count: seats.length },
    });
    for (const f of friends) {
      await ctx.db.insert("partyInvites", { requestId, userId: f.userId });
      await notify(ctx, {
        userId: f.userId,
        kind: "party_invite",
        actorId: userId,
        listingId: target._id,
        requestId,
        data: { ...formal, paysOwn: f.paysOwn, method: f.method },
      });
    }
    for (const token of linkTokens) {
      await ctx.db.insert("seatLinks", { token, requestId, createdAt: now });
      await ctx.scheduler.runAfter(SEAT_LINK_TTL_MS, internal.seatLinks.expireSeatLink, {
        requestId,
        token,
      });
    }

    return { requestId, autoAccepted: false as const, links: linkTokens };
  },
});

/** Tell a requester their request was turned down (by the host, or because it filled up). */
async function notifyDeclined(ctx: MutationCtx, req: Doc<"requests">) {
  const target = await ctx.db.get(req.targetListingId);
  await notify(ctx, {
    userId: req.fromUserId,
    kind: "request_declined",
    actorId: req.toUserId,
    listingId: req.targetListingId,
    requestId: req._id,
    ...(target ? { data: { college: target.college, dateTime: target.dateTime } } : {}),
  });
}

export const declineRequest = mutation({
  args: { requestId: v.id("requests") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const req = await ctx.db.get(args.requestId);
    if (!req) throw new Error("Request not found");
    if (req.toUserId !== userId) throw new Error("Not allowed");
    if (req.status !== "pending") throw new Error("Request is no longer pending");

    await ctx.db.patch(req._id, { status: "declined" });
    await notifyDeclined(ctx, req);
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

    for (const invite of await ctx.db
      .query("partyInvites")
      .withIndex("by_requestId", (q) => q.eq("requestId", req._id))
      .take(10)) {
      await ctx.db.delete(invite._id);
    }
    for (const link of await ctx.db
      .query("seatLinks")
      .withIndex("by_requestId", (q) => q.eq("requestId", req._id))
      .take(10)) {
      await ctx.db.delete(link._id);
    }
    await ctx.db.delete(req._id);
    return req._id;
  },
});

/** Take `count` seats on a listing for `holderId` (plus any named friends). */
async function seatOnListing(
  ctx: MutationCtx,
  listing: Doc<"listings">,
  args: {
    newMembers: Id<"users">[];
    guestHolderId: Id<"users">;
    guestCount: number;
    fullStatus: "closed" | "confirmed";
  },
): Promise<number> {
  const taken = args.newMembers.length + args.guestCount;
  const newSeats = listing.seatsAvailable - taken;
  await ctx.db.patch(listing._id, {
    seatsAvailable: newSeats,
    members: [...listing.members, ...args.newMembers],
    ...(args.guestCount > 0
      ? {
          guestSeats: withGuestSeats(
            listing.guestSeats,
            args.guestHolderId,
            args.guestCount,
          ),
        }
      : {}),
    ...(newSeats === 0 ? { status: args.fullStatus } : {}),
  });
  const updated = await ctx.db.get(listing._id);
  if (updated) {
    await syncListingAttendanceGuests(ctx, updated, Date.now());
  }
  return newSeats;
}

async function declinePendingWhenFull(
  ctx: MutationCtx,
  listingId: Id<"listings">,
  index: "by_targetListingId_and_status" | "by_offeringListingId_and_status",
  skip: Set<Id<"requests">>,
) {
  const pending =
    index === "by_targetListingId_and_status"
      ? await ctx.db
          .query("requests")
          .withIndex(index, (q) =>
            q.eq("targetListingId", listingId).eq("status", "pending"),
          )
          .take(200)
      : await ctx.db
          .query("requests")
          .withIndex(index, (q) =>
            q.eq("offeringListingId", listingId).eq("status", "pending"),
          )
          .take(200);
  for (const r of pending) {
    if (skip.has(r._id)) continue;
    await ctx.db.patch(r._id, { status: "declined" });
    await notifyDeclined(ctx, r);
  }
}

async function assertCanAcceptRequest(
  ctx: MutationCtx,
  req: Doc<"requests">,
  seats: Seat[],
): Promise<{ target: Doc<"listings">; offering?: Doc<"listings"> }> {
  const target = await getListingOrThrow(ctx, req.targetListingId);

  if (target.status !== "active") {
    throw new Error("Your listing is no longer active, so this request can't be accepted.");
  }
  if (listingIsPast(target.dateTime, Date.now())) {
    throw new Error("This formal has passed, so this request can't be accepted.");
  }
  if (target.seatsAvailable < seats.length) {
    throw new Error(
      target.seatsAvailable <= 0
        ? "Your listing has no seats left, so this request can't be accepted."
        : `This request needs ${seats.length} seats and your listing has ${target.seatsAvailable} left.`,
    );
  }
  for (const seat of seats) {
    if (seat.userId && target.members.includes(seat.userId)) {
      throw new Error("Someone in this request is already in your group.");
    }
  }
  const unclaimed = unclaimedLinkSeats(req);
  if (unclaimed > 0) {
    throw new Error(
      unclaimed === 1
        ? "Waiting for someone in this group to join Oxformals."
        : `Waiting for ${unclaimed} people in this group to join Oxformals.`,
    );
  }
  // A friend paying for their own seat has to say "I'm in" first — that's
  // what authorises taking their credit.
  for (const p of req.party ?? []) {
    if (p.kind !== "friend" || p.response === "out" || !p.userId) continue;
    if (p.payerId === p.userId && p.response !== "in") {
      const friend = await ctx.db.get(p.userId);
      throw new Error(
        `Waiting for ${friend?.name?.split(" ")[0] ?? "a friend"} to confirm they're coming.`,
      );
    }
  }

  const swapSeats = countByMethod(seats, "swap");
  if (swapSeats === 0) {
    return { target };
  }

  if (!req.offeringListingId) {
    throw new Error("Swap request is missing an offering listing.");
  }

  const offering = await getListingOrThrow(ctx, req.offeringListingId);
  if (offering.status !== "active") {
    throw new Error(
      "Their offering listing is no longer active, so this swap can't be accepted.",
    );
  }
  if (listingIsPast(offering.dateTime, Date.now())) {
    throw new Error(
      "Their offering formal has passed, so this swap can't be accepted.",
    );
  }
  if (offering.seatsAvailable < swapSeats) {
    throw new Error(
      offering.seatsAvailable <= 0
        ? "Their offering listing has no seats left, so this swap can't be accepted."
        : `This swap needs ${swapSeats} seats at their formal and it has ${offering.seatsAvailable} left.`,
    );
  }
  if (offering.members.includes(req.toUserId)) {
    throw new Error("You're already in their group.");
  }

  return { target, offering };
}

async function performAccept(
  ctx: MutationCtx,
  req: Doc<"requests">,
  skipIds: Id<"requests">[] = [],
) {
  const seats = requestSeats(req);
  const { target, offering } = await assertCanAcceptRequest(ctx, req, seats);

  await ctx.db.patch(req._id, { status: "accepted" });

  // Named people become members; unnamed guests are held against the requester.
  const named = seats.filter((s) => s.userId).map((s) => s.userId!);
  const guestCount = seats.filter((s) => s.kind === "guest").length;
  const newSeats = await seatOnListing(ctx, target, {
    newMembers: named,
    guestHolderId: req.fromUserId,
    guestCount,
    fullStatus: "closed",
  });

  const creditSeats = seats.filter((s) => s.method === "credit");
  if (creditSeats.length > 0) {
    await holdSeatCredits(ctx, {
      requestId: req._id,
      listing: target,
      charges: creditSeats.map((s) => ({
        payerId: s.payerId,
        seatHolderId: s.userId ?? req.fromUserId,
        isGuest: s.kind === "guest",
      })),
    });
  }

  const idsToSkip = new Set([req._id, ...skipIds]);
  if (newSeats === 0) {
    await declinePendingWhenFull(
      ctx,
      req.targetListingId,
      "by_targetListingId_and_status",
      idsToSkip,
    );
  }

  const swapSeats = countByMethod(seats, "swap");
  if (swapSeats === 0 || !offering || !req.offeringListingId) {
    return;
  }

  // Seats for seats: the host gets up to as many seats at the requester's
  // formal — their own plus guest seats they can release later.
  const newOfferingSeats = await seatOnListing(ctx, offering, {
    newMembers: [req.toUserId],
    guestHolderId: req.toUserId,
    guestCount: swapSeats - 1,
    fullStatus: "confirmed",
  });

  if (newOfferingSeats === 0) {
    await declinePendingWhenFull(
      ctx,
      req.offeringListingId,
      "by_offeringListingId_and_status",
      idsToSkip,
    );
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

    const target = await ctx.db.get(req.targetListingId);
    await notify(ctx, {
      userId: req.fromUserId,
      kind: "request_accepted",
      actorId: userId,
      listingId: req.targetListingId,
      requestId: req._id,
      ...(target ? { data: { college: target.college, dateTime: target.dateTime } } : {}),
    });
    return req._id;
  },
});

export const leaveGroup = mutation({
  args: { listingId: v.id("listings") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const link = await swapSeatingMember(ctx, args.listingId, userId);
    const result = await removeUserFromListingGroup(ctx, args.listingId, userId);
    // Leaving only gives up your own half of a swap; the other person keeps
    // their seat at your formal.
    if (link) {
      await ctx.db.patch(link._id, { status: "declined" });
      const listing = await ctx.db.get(args.listingId);
      const me = await ctx.db.get(userId);
      if (listing) {
        await sendFormalNotices(ctx, [
          {
            userId: listing.ownerUserId,
            subject: "Your swap partner left",
            body: `${me?.name?.split(" ")[0] ?? "Your swap partner"} gave up their half of your swap. Your seat at their formal is still yours.`,
            cta: "formals",
            eyebrow: "Swap",
            listingId: listing._id,
          },
        ]);
      }
    }
    return result;
  },
});

/**
 * Give back one of your unnamed guest seats (e.g. the host of a group swap
 * who got more seats than they need).
 */
export const releaseGuestSeat = mutation({
  args: { listingId: v.id("listings") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const listing = await getListingOrThrow(ctx, args.listingId);
    if (guestsBroughtBy(listing, userId) === 0) {
      throw new Error("You don't have a guest seat here.");
    }
    if (listingIsPast(listing.dateTime, Date.now())) {
      throw new Error("This formal has already happened.");
    }
    const newSeats = listing.seatsAvailable + 1;
    await ctx.db.patch(args.listingId, {
      guestSeats: withGuestSeats(listing.guestSeats, userId, -1),
      seatsAvailable: newSeats,
      ...(listing.status === "closed" || listing.status === "confirmed"
        ? { status: "active" as const }
        : {}),
    });
    await refundSeatHolderCredits(ctx, listing, userId, {
      guestsOnly: true,
      limit: 1,
    });
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

    const link = await swapSeatingMember(ctx, args.listingId, args.memberId);
    await detachMember(ctx, args.listingId, args.memberId);

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

    const notices: FormalNotice[] = [];
    if (link) {
      // Removing your swap partner undoes your half too.
      await undoSwap(ctx, link, args.listingId);
    }
    if (!listingIsPast(listing.dateTime, Date.now())) {
      const host = await ctx.db.get(userId);
      notices.push({
        userId: args.memberId,
        subject: "You were removed from a formal",
        body: `${host?.name?.split(" ")[0] ?? "The host"} removed you from their formal.${link ? " Your swap is off, so they lose their seat at yours too." : ""}`,
        cta: "browse",
        eyebrow: "Removed",
        listingId: listing._id,
      });
    }
    await sendFormalNotices(ctx, notices);

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
    formalType: v.optional(formalTypeValidator),
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

    if (listingIsPast(listing.dateTime, Date.now())) {
      throw new Error("Cannot edit a completed listing.");
    }

    const patch: Partial<Doc<"listings">> = {};

    if (args.dateTime !== undefined) {
      const timestamp = Date.parse(args.dateTime);
      if (Number.isNaN(timestamp)) {
        throw new Error("Invalid listing date.");
      }
      const nextDateTime = new Date(timestamp).toISOString();
      if (nextDateTime !== listing.dateTime) {
        if (occupiedSeats(listing) > 1) {
          throw new Error(
            "You can't change the date once people have joined. Cancel the formal instead.",
          );
        }
        patch.dateTime = nextDateTime;
      }
    }

    if (args.groupSize !== undefined) {
      const occupied = occupiedSeats(listing);
      if (args.groupSize < occupied) {
        throw new Error(
          "Group size cannot be less than the number of people already going.",
        );
      }
      patch.groupSize = args.groupSize;
      patch.seatsAvailable = args.groupSize - occupied;
    }

    if (args.message !== undefined) {
      patch.message = args.message.trim();
    }

    if (args.formalType !== undefined) {
      patch.formalType = args.formalType;
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
        await validateMenuPdfId(ctx, args.menuPdfId, userId);
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

    const updated = await ctx.db.get(args.listingId);
    if (updated && args.dateTime !== undefined && updated.attendanceAppliedAt === undefined) {
      await scheduleFormalCompletion(ctx, args.listingId, updated.dateTime);
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
      await applyCompletedFormalForListing(ctx, listing._id, nowMs);
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

    // An upcoming formal with guests is cancelled: they're told, and any
    // swaps tied to it are undone (the host loses the seats they got back).
    if (!listingIsPast(listing.dateTime, Date.now()) && listing.members.length > 1) {
      await undoSwapsForCancelledListing(ctx, listing);
      for (const guestId of listing.members) {
        if (guestId === userId) continue;
        await notify(ctx, {
          userId: guestId,
          kind: "formal_cancelled",
          actorId: userId,
          listingId: listing._id,
          data: { college: listing.college, dateTime: listing.dateTime },
        });
      }
    }
    if (!listingIsPast(listing.dateTime, Date.now())) {
      await refundListingCredits(ctx, listing._id);
    }

    await deleteMenuPdfIfPresent(ctx, listing.menuPdfId);
    await ctx.db.delete(args.listingId);
    return args.listingId;
  },
});
