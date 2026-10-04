import { v, type Infer } from "convex/values";

/**
 * Every notification has one kind, and each kind belongs to one category.
 * Categories are what people switch on and off in Settings.
 */

export const NOTIFICATION_CATEGORIES = [
  "bookings",
  "invites",
  "social",
  "credits",
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const KIND_CATEGORY = {
  request_received: "bookings",
  request_accepted: "bookings",
  request_declined: "bookings",
  formal_cancelled: "bookings",
  swap_undone: "bookings",
  party_invite: "invites",
  party_response: "invites",
  seat_link_claimed: "invites",
  new_follower: "social",
  follow_request: "social",
  now_friends: "social",
  invite_joined: "social",
  credit_earned: "credits",
  credit_paid_out: "credits",
  formal_tomorrow: "credits",
  wishlist_listing: "credits",
} as const satisfies Record<string, NotificationCategory>;

export type NotificationKind = keyof typeof KIND_CATEGORY;
export const NOTIFICATION_KINDS = Object.keys(KIND_CATEGORY) as NotificationKind[];

export function categoryOf(kind: NotificationKind): NotificationCategory {
  return KIND_CATEGORY[kind];
}

export const notificationCategoryValidator = v.union(
  v.literal("bookings"),
  v.literal("invites"),
  v.literal("social"),
  v.literal("credits"),
);

export const notificationKindValidator = v.union(
  v.literal("request_received"),
  v.literal("request_accepted"),
  v.literal("request_declined"),
  v.literal("formal_cancelled"),
  v.literal("swap_undone"),
  v.literal("party_invite"),
  v.literal("party_response"),
  v.literal("seat_link_claimed"),
  v.literal("new_follower"),
  v.literal("follow_request"),
  v.literal("now_friends"),
  v.literal("invite_joined"),
  v.literal("credit_earned"),
  v.literal("credit_paid_out"),
  v.literal("formal_tomorrow"),
  v.literal("wishlist_listing"),
);

/**
 * A snapshot of what the sentence needs, so a notification still reads right
 * after its listing is cancelled or edited.
 */
export const notificationDataValidator = v.object({
  college: v.optional(v.string()),
  dateTime: v.optional(v.string()),
  /** Seats in a request, or credits earned / paid out. */
  count: v.optional(v.number()),
  /** party_response: what the friend said. */
  response: v.optional(v.union(v.literal("in"), v.literal("out"))),
  /** credit_earned from a hold that pays out after the formal. */
  pending: v.optional(v.boolean()),
  /** credit_earned from an invite. */
  reason: v.optional(v.literal("referral")),
  /** party_invite: whether the friend pays for their own seat, and how. */
  paysOwn: v.optional(v.boolean()),
  method: v.optional(
    v.union(v.literal("swap"), v.literal("pay"), v.literal("credit")),
  ),
});
export type NotificationData = Infer<typeof notificationDataValidator>;
