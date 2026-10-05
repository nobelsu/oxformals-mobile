import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
import { groupSizeValidator } from "./groupSize";
import { uiFontValidator } from "./uiFont";
import { partySeatValidator } from "./seats";
import {
  notificationCategoryValidator,
  notificationDataValidator,
  notificationKindValidator,
} from "./notificationKinds";
import { notificationPrefsValidator } from "./notificationPrefs";

const avatar = v.optional(
  v.union(
    v.object({ kind: v.literal("preset"), id: v.string() }),
    v.object({ kind: v.literal("image"), dataUrl: v.string() }),
  ),
);

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    college: v.optional(v.string()),
    year: v.optional(v.string()),
    role: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    instagramHandle: v.optional(v.string()),
    whatsappPhone: v.optional(v.string()),
    dietaryRequirements: v.optional(v.string()),
    /**
     * When the user opted in to sharing dietary requirements with their formal
     * matches. New text is only stored with this set; legacy values without it
     * are kept and re-confirmed on the next edit.
     */
    dietaryConsentAt: v.optional(v.number()),
    subject: v.optional(v.string()),
    wishlistColleges: v.optional(v.array(v.string())),
    emailNotifications: v.optional(v.boolean()),
    /** @deprecated Migrated to emailNotifications; kept for backfill reads only */
    emailWishlistAlerts: v.optional(v.boolean()),
    pushChatAlerts: v.optional(v.boolean()),
    agreedToRules: v.optional(v.boolean()),
    /** When the user accepted the Terms and Privacy policy (end of onboarding). */
    agreedToTermsAt: v.optional(v.number()),
    uiFont: v.optional(uiFontValidator),
    avatar,
    /** Set when the account was deleted; the row is a "Deleted user" placeholder. */
    deletedAt: v.optional(v.number()),
    /** Free-form, moderated bio (max 150 chars); replaces interests on the web. */
    bio: v.optional(v.string()),
    /** Badges earned after this are celebrated once (see badges.getMyNewBadges). */
    badgesSeenAt: v.optional(v.number()),
    /**
     * Private account: follows need approval, and activity (reviews, formals
     * attended, badges, feed items) is hidden from non-followers.
     */
    isPrivate: v.optional(v.boolean()),
    /**
     * False when someone has switched off being found by people who hold
     * their number or email (convex/contacts.ts). Absent means findable.
     */
    discoverableByContacts: v.optional(v.boolean()),
    /** Push/email per category. Absent means the defaults (see resolvePrefs). */
    notificationPrefs: v.optional(notificationPrefsValidator),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_deletedAt", ["deletedAt"])
    .index("by_college", ["college"])
    /** Find people by name (peopleSearch.ts). */
    .searchIndex("search_name", { searchField: "name" }),
  collegeWishlists: defineTable({
    userId: v.id("users"),
    college: v.string(),
  })
    .index("by_college", ["college"])
    .index("by_userId", ["userId"])
    .index("by_userId_and_college", ["userId", "college"]),
  listings: defineTable({
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
    status: v.union(
      v.literal("active"),
      v.literal("confirmed"),
      v.literal("closed"),
      v.literal("expired"),
    ),
    listingType: v.optional(
      v.union(v.literal("swap"), v.literal("pay"), v.literal("both")),
    ),
    // The "vibe" of the formal. Optional for back-compat; unset rows are treated
    // as "social" by the client mapper and the backfill migration.
    formalType: v.optional(
      v.union(
        v.literal("matchmaking"),
        v.literal("social"),
        v.literal("networking"),
      ),
    ),
    price: v.optional(v.number()),
    attendanceAppliedAt: v.optional(v.number()),
    attendanceGuestCount: v.optional(v.number()),
    /**
     * Unnamed "+N" guests, keyed by the member who brought them. Each takes a
     * seat: seatsAvailable = groupSize − members − Σ count.
     */
    guestSeats: v.optional(
      v.array(v.object({ userId: v.id("users"), count: v.number() })),
    ),
  })
    .index("by_ownerUserId", ["ownerUserId"])
    .index("by_status", ["status"])
    .index("by_college_and_status", ["college", "status"])
    .index("by_status_and_dateTime", ["status", "dateTime"]),
  requests: defineTable({
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    targetListingId: v.id("listings"),
    offeringListingId: v.optional(v.id("listings")),
    requestType: v.optional(
      v.union(v.literal("swap"), v.literal("pay"), v.literal("credit")),
    ),
    message: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
    ),
    /**
     * Extra seats beyond the requester's own (whose seat is paid by
     * `requestType`). Unnamed guests are paid by the requester; a named friend
     * can pay for themselves. Bounded by the listing's group size (≤ 4).
     */
    party: v.optional(v.array(partySeatValidator)),
  })
    .index("by_toUserId", ["toUserId"])
    .index("by_fromUserId", ["fromUserId"])
    .index("by_targetListingId", ["targetListingId"])
    .index("by_offeringListingId", ["offeringListingId"])
    .index("by_targetListingId_and_status", ["targetListingId", "status"])
    .index("by_offeringListingId_and_status", ["offeringListingId", "status"]),
  conversations: defineTable({
    kind: v.optional(v.union(v.literal("dm"), v.literal("group"))),
    participantLow: v.optional(v.id("users")),
    participantHigh: v.optional(v.id("users")),
    lastMessageAt: v.number(),
    participantLowLastReadAt: v.optional(v.number()),
    participantHighLastReadAt: v.optional(v.number()),
    participantLowClearedAt: v.optional(v.number()),
    participantHighClearedAt: v.optional(v.number()),
    name: v.optional(v.string()),
    createdByUserId: v.optional(v.id("users")),
    sourceListingId: v.optional(v.id("listings")),
  })
    .index("by_participants", ["participantLow", "participantHigh"])
    .index("by_participantLow", ["participantLow", "lastMessageAt"])
    .index("by_participantHigh", ["participantHigh", "lastMessageAt"])
    .index("by_sourceListingId", ["sourceListingId"]),
  conversationMembers: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    lastReadAt: v.optional(v.number()),
    joinedAt: v.number(),
  })
    .index("by_conversationId", ["conversationId"])
    .index("by_userId", ["userId"])
    .index("by_userId_and_conversationId", ["userId", "conversationId"]),
  messages: defineTable({
    conversationId: v.id("conversations"),
    senderUserId: v.id("users"),
    body: v.string(),
    replyToMessageId: v.optional(v.id("messages")),
    referencedListingId: v.optional(v.id("listings")),
    mentions: v.optional(
      v.array(
        v.object({
          userId: v.id("users"),
          label: v.string(),
          start: v.number(),
        }),
      ),
    ),
  })
    .index("by_conversationId", ["conversationId"])
    .index("by_senderUserId", ["senderUserId"]),
  pushTokens: defineTable({
    userId: v.id("users"),
    token: v.string(),
    platform: v.union(v.literal("ios"), v.literal("android")),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_token", ["token"]),
  uploadedFiles: defineTable({
    storageId: v.id("_storage"),
    ownerUserId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_storageId", ["storageId"])
    .index("by_ownerUserId", ["ownerUserId"]),
  collegeReviews: defineTable({
    userId: v.id("users"),
    listingId: v.id("listings"),
    college: v.string(),
    ratings: v.object({
      food: v.number(),
      atmosphere: v.number(),
      value: v.number(),
      overall: v.number(),
    }),
    comment: v.optional(v.string()),
    imageIds: v.optional(v.array(v.id("_storage"))),
    isAnonymous: v.boolean(),
    updatedAt: v.number(),
    voteScore: v.optional(v.number()),
  })
    .index("by_listingId_and_userId", ["listingId", "userId"])
    .index("by_college", ["college"])
    .index("by_userId", ["userId"]),
  collegeReviewVotes: defineTable({
    reviewId: v.id("collegeReviews"),
    userId: v.id("users"),
    value: v.union(v.literal(1), v.literal(-1)),
    updatedAt: v.number(),
  })
    .index("by_reviewId_and_userId", ["reviewId", "userId"])
    .index("by_reviewId", ["reviewId"])
    .index("by_userId", ["userId"]),
  collegeReviewReports: defineTable({
    reviewId: v.id("collegeReviews"),
    reporterUserId: v.id("users"),
    reason: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_reviewId", ["reviewId"])
    .index("by_reporterUserId", ["reporterUserId"]),
  collegeStats: defineTable({
    college: v.string(),
    reviewCount: v.number(),
    ratingSums: v.object({
      food: v.number(),
      atmosphere: v.number(),
      value: v.number(),
      overall: v.number(),
    }),
    attendanceCount: v.number(),
    completedFormalCount: v.number(),
    updatedAt: v.number(),
  }).index("by_college", ["college"]),
  formalAttendanceConfirmations: defineTable({
    listingId: v.id("listings"),
    userId: v.id("users"),
    confirmedAt: v.number(),
    /** Omitted on legacy rows — treated as attended. */
    attended: v.optional(v.boolean()),
    reasonPreset: v.optional(v.string()),
    reasonOther: v.optional(v.string()),
  })
    .index("by_listingId_and_userId", ["listingId", "userId"])
    .index("by_userId", ["userId"])
    .index("by_listingId", ["listingId"]),
  userBadges: defineTable({
    userId: v.id("users"),
    badgeId: v.string(),
    earnedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_badgeId", ["userId", "badgeId"]),
  /**
   * Comments on campus-feed items. `targetKey` is the feed item's stable key
   * (e.g. "review:<id>", "listing:<id>", "attended:<college-slug>:<date>") so a
   * thread survives the feed being re-assembled on the fly and can attach to a
   * bundled item that has no single source row.
   */
  feedComments: defineTable({
    targetKey: v.string(),
    userId: v.id("users"),
    text: v.string(),
  })
    .index("by_targetKey", ["targetKey"])
    .index("by_userId", ["userId"]),
  /** Likes on campus-feed items, keyed by the same stable `targetKey`. */
  feedLikes: defineTable({
    targetKey: v.string(),
    userId: v.id("users"),
  })
    .index("by_targetKey", ["targetKey"])
    .index("by_targetKey_and_userId", ["targetKey", "userId"])
    .index("by_userId", ["userId"]),
  /** Reports of another user's bio; one per reporter per user. */
  bioReports: defineTable({
    reportedUserId: v.id("users"),
    reporterUserId: v.id("users"),
    bioText: v.string(),
  })
    .index("by_reportedUserId_and_reporterUserId", [
      "reportedUserId",
      "reporterUserId",
    ])
    .index("by_reporterUserId", ["reporterUserId"]),
  /**
   * Reports of a person or something they posted (see convex/reports.ts).
   * `targetKey` is "user:<id>" / "listing:<id>" / "comment:<id>" /
   * "message:<id>"; one row per reporter per target.
   */
  reports: defineTable({
    reporterUserId: v.id("users"),
    reportedUserId: v.id("users"),
    targetKey: v.string(),
    reason: v.union(
      v.literal("spam"),
      v.literal("harassment"),
      v.literal("inappropriate"),
      v.literal("impersonation"),
      v.literal("other"),
    ),
    details: v.optional(v.string()),
    /** The reported text as it read when reported. */
    snapshot: v.optional(v.string()),
  })
    .index("by_reporterUserId_and_targetKey", ["reporterUserId", "targetKey"])
    .index("by_reportedUserId", ["reportedUserId"]),
  /** Per-user saved feed items, keyed by the same stable `targetKey`. */
  feedBookmarks: defineTable({
    targetKey: v.string(),
    userId: v.id("users"),
  })
    .index("by_userId", ["userId"])
    .index("by_targetKey_and_userId", ["targetKey", "userId"]),
  /**
   * A swap broken after the wronged side's formal had already happened, so the
   * breaker's seat couldn't be taken back. Emailed to the team when recorded.
   */
  swapBreaks: defineTable({
    requestId: v.id("requests"),
    brokenByUserId: v.id("users"),
    wrongedUserId: v.id("users"),
    listingId: v.id("listings"),
    createdAt: v.number(),
  })
    .index("by_brokenByUserId", ["brokenByUserId"])
    .index("by_createdAt", ["createdAt"]),
  /**
   * The insider guide on a college page. Filled in by members of that
   * college; one row per college, last edit wins.
   */
  collegeGuides: defineTable({
    college: v.string(),
    formalNights: v.array(v.string()),
    gowns: v.optional(v.union(v.literal("yes"), v.literal("no"), v.literal("sometimes"))),
    guestPrice: v.optional(v.number()),
    dressCode: v.optional(
      v.union(
        v.literal("smart"),
        v.literal("suit"),
        v.literal("blackTie"),
        v.literal("casual"),
      ),
    ),
    /** Unset when the last editor deletes their account. */
    updatedBy: v.optional(v.id("users")),
    updatedAt: v.number(),
  }).index("by_college", ["college"]),
  /** Short moderated tips about a college, from its own members. */
  collegeTips: defineTable({
    college: v.string(),
    userId: v.id("users"),
    text: v.string(),
    createdAt: v.number(),
  })
    .index("by_college", ["college"])
    .index("by_userId", ["userId"]),
  /**
   * Lookup for "requests I've been named in". The answer itself lives on the
   * request's `party` entry; this row just lets a friend find the request.
   */
  partyInvites: defineTable({
    requestId: v.id("requests"),
    userId: v.id("users"),
  })
    .index("by_userId", ["userId"])
    .index("by_requestId", ["requestId"]),
  /**
   * Who follows whom. Following a private account starts "pending" until
   * they approve. Two active follows either way make two people friends.
   */
  follows: defineTable({
    followerId: v.id("users"),
    followeeId: v.id("users"),
    status: v.union(v.literal("active"), v.literal("pending")),
  })
    .index("by_followerId_and_followeeId", ["followerId", "followeeId"])
    .index("by_followerId_and_status", ["followerId", "status"])
    .index("by_followeeId_and_status", ["followeeId", "status"]),
  /**
   * `blockerId` has blocked `blockedId`. Either direction hides the two from
   * each other and stops follows, messages and requests between them.
   */
  blocks: defineTable({
    blockerId: v.id("users"),
    blockedId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_blockerId_and_blockedId", ["blockerId", "blockedId"])
    .index("by_blockedId", ["blockedId"]),
  /**
   * Seat credits: earned by hosting a credit-paying guest, spent on a seat at
   * any formal. No row means the user still has their 1 starter credit.
   */
  creditAccounts: defineTable({
    userId: v.id("users"),
    balance: v.number(),
  }).index("by_userId", ["userId"]),
  /**
   * One credit for one seat, taken from the payer when the host accepts and
   * paid to the host 24h after the formal (unless disputed). `seatHolderId` is
   * the member whose seat it is (or who brought the unnamed guest).
   */
  creditHolds: defineTable({
    requestId: v.id("requests"),
    listingId: v.id("listings"),
    payerId: v.id("users"),
    hostId: v.id("users"),
    seatHolderId: v.id("users"),
    isGuest: v.boolean(),
    status: v.union(
      v.literal("held"),
      v.literal("paid"),
      v.literal("refunded"),
      v.literal("disputed"),
    ),
    releaseAt: v.number(),
    /** When it became paid or refunded (older rows: unset, use releaseAt). */
    resolvedAt: v.optional(v.number()),
  })
    .index("by_status_and_releaseAt", ["status", "releaseAt"])
    .index("by_listingId_and_seatHolderId", ["listingId", "seatHolderId"])
    .index("by_listingId", ["listingId"])
    .index("by_payerId_and_status", ["payerId", "status"])
    .index("by_hostId_and_status", ["hostId", "status"]),
  /**
   * The bell. One row per thing that happened to `userId`; `data` snapshots
   * what the sentence needs. Deleted after 90 days.
   */
  notifications: defineTable({
    userId: v.id("users"),
    category: notificationCategoryValidator,
    kind: notificationKindValidator,
    actorId: v.optional(v.id("users")),
    listingId: v.optional(v.id("listings")),
    requestId: v.optional(v.id("requests")),
    data: v.optional(notificationDataValidator),
    /** kind + the ids involved: a repeat within 24h is skipped. */
    dedupeKey: v.string(),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_userId_and_createdAt", ["userId", "createdAt"])
    .index("by_userId_and_readAt", ["userId", "readAt"])
    .index("by_userId_and_dedupeKey", ["userId", "dedupeKey"])
    .index("by_createdAt", ["createdAt"]),
  /** Browser push subscriptions (one per browser the user allowed alerts in). */
  webPushSubscriptions: defineTable({
    userId: v.id("users"),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_endpoint", ["endpoint"]),
  /** Each person's invite link: /i/<code>. Made the first time they share it. */
  inviteCodes: defineTable({
    userId: v.id("users"),
    code: v.string(),
    createdAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_userId", ["userId"]),
  /**
   * Who brought whom. One per invitee. "earned" paid the inviter a credit (at
   * most 5); "void" is past the cap, or the inviter or invitee is gone.
   */
  referrals: defineTable({
    inviterId: v.id("users"),
    inviteeId: v.id("users"),
    source: v.union(v.literal("link"), v.literal("seat")),
    status: v.union(v.literal("pending"), v.literal("earned"), v.literal("void")),
    createdAt: v.number(),
  })
    .index("by_inviteeId", ["inviteeId"])
    .index("by_inviterId_and_status", ["inviterId", "status"]),
  /** Lookup for /s/<token>; the seat itself lives on the request's party. */
  seatLinks: defineTable({
    token: v.string(),
    requestId: v.id("requests"),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_requestId", ["requestId"]),
});
