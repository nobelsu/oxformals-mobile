import type { CollegeReviewRatings } from "./collegeReviews";

export type RatingSums = CollegeReviewRatings;

export const EMPTY_RATING_SUMS: RatingSums = {
  food: 0,
  atmosphere: 0,
  value: 0,
  overall: 0,
};

export type CollegeStatsSnapshot = {
  reviewCount: number;
  ratingSums: RatingSums;
  attendanceCount: number;
  completedFormalCount: number;
};

export const EMPTY_COLLEGE_STATS: CollegeStatsSnapshot = {
  reviewCount: 0,
  ratingSums: { ...EMPTY_RATING_SUMS },
  attendanceCount: 0,
  completedFormalCount: 0,
};

export function addRatingSums(a: RatingSums, b: RatingSums): RatingSums {
  return {
    food: a.food + b.food,
    atmosphere: a.atmosphere + b.atmosphere,
    value: a.value + b.value,
    overall: a.overall + b.overall,
  };
}

export function subtractRatingSums(a: RatingSums, b: RatingSums): RatingSums {
  return {
    food: a.food - b.food,
    atmosphere: a.atmosphere - b.atmosphere,
    value: a.value - b.value,
    overall: a.overall - b.overall,
  };
}

export function averagesFromSums(
  sums: RatingSums,
  reviewCount: number,
): CollegeReviewRatings | null {
  if (reviewCount === 0) return null;
  return {
    food: sums.food / reviewCount,
    atmosphere: sums.atmosphere / reviewCount,
    value: sums.value / reviewCount,
    overall: sums.overall / reviewCount,
  };
}

export function applyReviewInsert(
  stats: CollegeStatsSnapshot,
  ratings: CollegeReviewRatings,
): CollegeStatsSnapshot {
  return {
    reviewCount: stats.reviewCount + 1,
    ratingSums: addRatingSums(stats.ratingSums, ratings),
    attendanceCount: stats.attendanceCount,
    completedFormalCount: stats.completedFormalCount,
  };
}

export function applyReviewUpdate(
  stats: CollegeStatsSnapshot,
  oldRatings: CollegeReviewRatings,
  newRatings: CollegeReviewRatings,
): CollegeStatsSnapshot {
  return {
    ...stats,
    ratingSums: addRatingSums(
      subtractRatingSums(stats.ratingSums, oldRatings),
      newRatings,
    ),
  };
}

export function applyFormalCompleted(
  stats: CollegeStatsSnapshot,
  guestCount: number,
): CollegeStatsSnapshot {
  return {
    ...stats,
    attendanceCount: stats.attendanceCount + guestCount,
    completedFormalCount: stats.completedFormalCount + 1,
  };
}

export function applyAttendanceGuestDelta(
  stats: CollegeStatsSnapshot,
  delta: number,
): CollegeStatsSnapshot {
  return {
    ...stats,
    attendanceCount: stats.attendanceCount + delta,
  };
}

/** One guest confirmed attendance; optionally the first confirmation for this formal. */
export function applyAttendanceConfirmation(
  stats: CollegeStatsSnapshot,
  isFirstConfirmationForListing: boolean,
): CollegeStatsSnapshot {
  return {
    ...stats,
    attendanceCount: stats.attendanceCount + 1,
    completedFormalCount: isFirstConfirmationForListing
      ? stats.completedFormalCount + 1
      : stats.completedFormalCount,
  };
}
