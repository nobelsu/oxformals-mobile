import { normalizeCollegeName } from "./colleges";

export type ReviewEligibilityListing = {
  college: string;
  dateTime: string;
  members: string[];
  ownerUserId?: string;
};

export type ReviewEligibilityUser = {
  id: string;
  college?: string;
};

export type ReviewEligibilityResult = {
  canReview: boolean;
  isPast: boolean;
  reason?: string;
};

export type ConfirmAttendanceResult = {
  canConfirm: boolean;
  isPast: boolean;
  reason?: string;
};

export function listingIsPast(dateTime: string, nowMs: number): boolean {
  const t = Date.parse(dateTime);
  if (Number.isNaN(t)) return false;
  return t <= nowMs;
}

/** True when the user is visiting another college's formal (not the host college). */
export function isGuestForCollegeListing(
  user: ReviewEligibilityUser | null | undefined,
  listingCollege: string,
): boolean {
  if (!user) return false;
  const home = normalizeCollegeName(user.college ?? "");
  const host = normalizeCollegeName(listingCollege);
  return !(home && host && home === host);
}

function baseGuestEligibility(
  user: ReviewEligibilityUser | null | undefined,
  listing: ReviewEligibilityListing,
  nowMs: number,
): { isPast: boolean; reason?: string } | { ok: true; isPast: boolean } {
  const isPast = listingIsPast(listing.dateTime, nowMs);
  if (!user) {
    return { isPast, reason: "Sign in to continue." };
  }
  if (!listing.members.includes(user.id)) {
    return {
      isPast,
      reason: "Only group members can confirm attendance for this formal.",
    };
  }
  if (listing.ownerUserId && listing.ownerUserId === user.id) {
    return {
      isPast,
      reason: "Hosts do not need to confirm attendance.",
    };
  }
  if (!isPast) {
    return {
      isPast,
      reason: "You can confirm attendance after the formal has taken place.",
    };
  }
  const home = normalizeCollegeName(user.college ?? "");
  const host = normalizeCollegeName(listing.college);
  if (home && host && home === host) {
    return {
      isPast,
      reason: "You cannot confirm attendance for your own college's formal.",
    };
  }
  return { ok: true, isPast };
}

export function canConfirmAttendanceCollegeListing(
  user: ReviewEligibilityUser | null | undefined,
  listing: ReviewEligibilityListing,
  nowMs: number,
  options?: { hasRespondedToAttendance?: boolean },
): ConfirmAttendanceResult {
  const base = baseGuestEligibility(user, listing, nowMs);
  if (!("ok" in base)) {
    return { canConfirm: false, isPast: base.isPast, reason: base.reason };
  }
  if (options?.hasRespondedToAttendance) {
    return {
      canConfirm: false,
      isPast: base.isPast,
      reason: "You already responded about this formal.",
    };
  }
  return { canConfirm: true, isPast: base.isPast };
}

export function canReviewCollegeListing(
  user: ReviewEligibilityUser | null | undefined,
  listing: ReviewEligibilityListing,
  nowMs: number,
  options?: { hasExistingReview?: boolean; hasConfirmedAttendance?: boolean },
): ReviewEligibilityResult {
  const isPast = listingIsPast(listing.dateTime, nowMs);
  if (!user) {
    return { canReview: false, isPast, reason: "Sign in to rate this formal." };
  }
  if (!listing.members.includes(user.id)) {
    return {
      canReview: false,
      isPast,
      reason: "Only group members can rate this formal.",
    };
  }
  if (!isPast) {
    return {
      canReview: false,
      isPast,
      reason: "You can rate this formal after it has taken place.",
    };
  }
  const home = normalizeCollegeName(user.college ?? "");
  const host = normalizeCollegeName(listing.college);
  if (home && host && home === host) {
    return {
      canReview: false,
      isPast,
      reason: "You cannot review your own college's formal.",
    };
  }
  if (options?.hasExistingReview) {
    return { canReview: false, isPast, reason: "You already reviewed this formal." };
  }
  if (!options?.hasConfirmedAttendance) {
    return {
      canReview: false,
      isPast,
      reason: "Confirm that you attended this formal before leaving a review.",
    };
  }
  return { canReview: true, isPast };
}
