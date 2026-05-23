import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  canConfirmAttendanceCollegeListing,
  canReviewCollegeListing,
} from "../lib/data/collegeReviewEligibility";
import { normalizeCollegeName } from "../lib/data/colleges";
import type { CollegeReviewCategory } from "../lib/data/collegeReviews";
import { isImageContentType } from "../lib/upload/imageFile";
import { claimStorageOwnership, deleteStorageAndOwnership } from "./uploadOwnership";

export { normalizeCollegeName };

export type ReviewRatings = {
  food: number;
  atmosphere: number;
  value: number;
  overall: number;
};

const RATING_KEYS: (keyof ReviewRatings)[] = [
  "food",
  "atmosphere",
  "value",
  "overall",
];

export function clampRating(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(5, Math.max(1, Math.round(n)));
}

export function normalizeRatings(raw: Partial<ReviewRatings>): ReviewRatings {
  return {
    food: clampRating(raw.food ?? 1),
    atmosphere: clampRating(raw.atmosphere ?? 1),
    value: clampRating(raw.value ?? 1),
    overall: clampRating(raw.overall ?? 1),
  };
}

export function ratingForCategory(
  ratings: ReviewRatings,
  category: CollegeReviewCategory,
): number {
  return ratings[category];
}

export function averageRatings(reviews: Doc<"collegeReviews">[]): ReviewRatings | null {
  if (reviews.length === 0) return null;
  const sums: ReviewRatings = {
    food: 0,
    atmosphere: 0,
    value: 0,
    overall: 0,
  };
  for (const r of reviews) {
    for (const key of RATING_KEYS) {
      sums[key] += r.ratings[key];
    }
  }
  const n = reviews.length;
  return {
    food: sums.food / n,
    atmosphere: sums.atmosphere / n,
    value: sums.value / n,
    overall: sums.overall / n,
  };
}

function listingEligibilityInput(listing: Doc<"listings">) {
  return {
    college: listing.college,
    dateTime: listing.dateTime,
    members: listing.members.map(String),
    ownerUserId: listing.ownerUserId,
  };
}

export function getReviewEligibility(
  user: Doc<"users"> | null,
  listing: Doc<"listings">,
  userId: Id<"users"> | null,
  nowMs: number,
  options: {
    hasExistingReview: boolean;
    hasConfirmedAttendance: boolean;
  },
): ReturnType<typeof canReviewCollegeListing> {
  if (!userId || !user) {
    return canReviewCollegeListing(null, listingEligibilityInput(listing), nowMs, {
      hasExistingReview: options.hasExistingReview,
      hasConfirmedAttendance: options.hasConfirmedAttendance,
    });
  }
  return canReviewCollegeListing(
    { id: userId, college: user.college },
    listingEligibilityInput(listing),
    nowMs,
    {
      hasExistingReview: options.hasExistingReview,
      hasConfirmedAttendance: options.hasConfirmedAttendance,
    },
  );
}

export function getConfirmAttendanceEligibility(
  user: Doc<"users"> | null,
  listing: Doc<"listings">,
  userId: Id<"users"> | null,
  nowMs: number,
  hasRespondedToAttendance: boolean,
): ReturnType<typeof canConfirmAttendanceCollegeListing> {
  if (!userId || !user) {
    return canConfirmAttendanceCollegeListing(
      null,
      listingEligibilityInput(listing),
      nowMs,
      { hasRespondedToAttendance },
    );
  }
  return canConfirmAttendanceCollegeListing(
    { id: userId, college: user.college },
    listingEligibilityInput(listing),
    nowMs,
    { hasRespondedToAttendance },
  );
}

export const MAX_REVIEW_COMMENT_LENGTH = 2000;
export const MAX_REVIEW_IMAGES = 3;

export async function validateReviewImageIds(
  ctx: MutationCtx,
  imageIds: Id<"_storage">[] | undefined,
  ownerUserId: Id<"users">,
): Promise<Id<"_storage">[] | undefined> {
  if (!imageIds || imageIds.length === 0) return undefined;

  const unique = [...new Set(imageIds)];
  if (unique.length !== imageIds.length) {
    throw new Error("Duplicate images are not allowed.");
  }
  if (unique.length > MAX_REVIEW_IMAGES) {
    throw new Error(`You can attach at most ${MAX_REVIEW_IMAGES} images.`);
  }

  for (const imageId of unique) {
    const metadata = await ctx.db.system.get("_storage", imageId);
    if (!metadata) {
      throw new Error("Image not found. Try uploading again.");
    }
    if (!isImageContentType(metadata.contentType)) {
      throw new Error("Review images must be JPEG, PNG, WebP, or GIF.");
    }
    await claimStorageOwnership(ctx, imageId, ownerUserId);
  }

  return unique;
}

export async function deleteReviewImagesIfPresent(
  ctx: MutationCtx,
  imageIds: Id<"_storage">[] | undefined,
): Promise<void> {
  if (!imageIds) return;
  for (const imageId of imageIds) {
    await deleteStorageAndOwnership(ctx, imageId);
  }
}

export function reviewImageIdsRemoved(
  previous: Id<"_storage">[] | undefined,
  next: Id<"_storage">[] | undefined,
): Id<"_storage">[] {
  const prev = previous ?? [];
  const nxt = new Set(next ?? []);
  return prev.filter((id) => !nxt.has(id));
}
