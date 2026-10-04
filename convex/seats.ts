import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { MAX_GROUP_SIZE } from "./groupSize";

/**
 * Seats belong to listings. A listing's seats are taken by its members (the
 * host plus named guests) and by unnamed "+N" guests, which are recorded
 * against the member who brought them.
 */

export const seatMethodValidator = v.union(
  v.literal("swap"),
  v.literal("pay"),
  v.literal("credit"),
);

export const partySeatValidator = v.object({
  kind: v.union(v.literal("guest"), v.literal("friend"), v.literal("link")),
  /** The named friend; absent for an unnamed guest or an unclaimed link. */
  userId: v.optional(v.id("users")),
  /** Who pays. For an unclaimed link: the requester, until it's claimed. */
  payerId: v.id("users"),
  method: seatMethodValidator,
  /** A named friend's answer: "in" (confirmed) or "out" ("Not me"). A link's "out" = expired. */
  response: v.optional(
    v.union(v.literal("pending"), v.literal("in"), v.literal("out")),
  ),
  /** Link seats (someone not on Oxformals yet): the token in /s/<token>. */
  token: v.optional(v.string()),
  /** Link seats: when an unclaimed link lapses. */
  expiresAt: v.optional(v.number()),
  /** Link seats: the new person pays for themselves (with a credit) once they join. */
  paysOwn: v.optional(v.boolean()),
});

export type SeatMethod = "swap" | "pay" | "credit";
export type GuestSeats = NonNullable<Doc<"listings">["guestSeats"]>;

export type Seat = {
  kind: "requester" | "friend" | "guest";
  /** Who sits there; absent for an unnamed guest. */
  userId?: Id<"users">;
  payerId: Id<"users">;
  method: SeatMethod;
};

/**
 * Most people a requester can bring: the biggest group, less the host and
 * the requester themselves.
 */
export const MAX_GUESTS = MAX_GROUP_SIZE - 2;

export function guestsBroughtBy(
  listing: Pick<Doc<"listings">, "guestSeats">,
  userId: Id<"users">,
): number {
  return listing.guestSeats?.find((g) => g.userId === userId)?.count ?? 0;
}

export function totalGuestSeats(
  listing: Pick<Doc<"listings">, "guestSeats">,
): number {
  return (listing.guestSeats ?? []).reduce((sum, g) => sum + g.count, 0);
}

/** Seats taken on a listing: members plus unnamed guests. */
export function occupiedSeats(
  listing: Pick<Doc<"listings">, "members" | "guestSeats">,
): number {
  return listing.members.length + totalGuestSeats(listing);
}

/** `guestSeats` with `userId`'s count changed by `delta` (dropping zeros). */
export function withGuestSeats(
  guestSeats: GuestSeats | undefined,
  userId: Id<"users">,
  delta: number,
): GuestSeats {
  const current = guestSeats ?? [];
  const existing = current.find((g) => g.userId === userId)?.count ?? 0;
  const next = Math.max(0, existing + delta);
  const others = current.filter((g) => g.userId !== userId);
  return next > 0 ? [...others, { userId, count: next }] : others;
}

export function requestMethod(req: Doc<"requests">): SeatMethod {
  return (
    req.requestType ?? (req.offeringListingId !== undefined ? "swap" : "pay")
  );
}

/**
 * Every seat a request asks for: the requester's own, then its party, minus
 * named friends who said "Not me".
 */
export function requestSeats(req: Doc<"requests">): Seat[] {
  const seats: Seat[] = [
    {
      kind: "requester",
      userId: req.fromUserId,
      payerId: req.fromUserId,
      method: requestMethod(req),
    },
  ];
  for (const p of req.party ?? []) {
    if (p.response === "out") continue;
    seats.push({
      // An unclaimed link holds a seat like an unnamed guest (it can't be
      // accepted until someone claims it).
      kind: p.kind === "link" ? "guest" : p.kind,
      ...(p.userId ? { userId: p.userId } : {}),
      payerId: p.payerId,
      method: p.method,
    });
  }
  return seats;
}

/** Link seats nobody has claimed yet (and that haven't expired). */
export function unclaimedLinkSeats(req: Pick<Doc<"requests">, "party">): number {
  return (req.party ?? []).filter((p) => p.kind === "link" && p.response !== "out").length;
}

export function countByMethod(seats: Seat[], method: SeatMethod): number {
  return seats.filter((s) => s.method === method).length;
}
