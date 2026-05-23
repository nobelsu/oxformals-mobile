import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
import { groupSizeValidator } from "./groupSize";
import { uiFontValidator } from "./uiFont";

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
    subject: v.optional(v.string()),
    wishlistColleges: v.optional(v.array(v.string())),
    emailNotifications: v.optional(v.boolean()),
    /** @deprecated Migrated to emailNotifications; kept for backfill reads only */
    emailWishlistAlerts: v.optional(v.boolean()),
    pushChatAlerts: v.optional(v.boolean()),
    agreedToRules: v.optional(v.boolean()),
    uiFont: v.optional(uiFontValidator),
    avatar,
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),
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
    price: v.optional(v.number()),
    attendanceAppliedAt: v.optional(v.number()),
    attendanceGuestCount: v.optional(v.number()),
  })
    .index("by_ownerUserId", ["ownerUserId"])
    .index("by_status", ["status"])
    .index("by_college_and_status", ["college", "status"]),
  requests: defineTable({
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    targetListingId: v.id("listings"),
    offeringListingId: v.optional(v.id("listings")),
    requestType: v.optional(v.union(v.literal("swap"), v.literal("pay"))),
    message: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
    ),
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
  }).index("by_conversationId", ["conversationId"]),
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
    .index("by_reviewId", ["reviewId"]),
  collegeReviewReports: defineTable({
    reviewId: v.id("collegeReviews"),
    reporterUserId: v.id("users"),
    reason: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_reviewId", ["reviewId"]),
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
});
