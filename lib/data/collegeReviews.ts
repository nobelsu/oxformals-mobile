export type CollegeReviewCategory =
  | "overall"
  | "food"
  | "atmosphere"
  | "value";

export const COLLEGE_REVIEW_CATEGORIES: {
  key: CollegeReviewCategory;
  label: string;
}[] = [
  { key: "overall", label: "Overall" },
  { key: "food", label: "Food" },
  { key: "atmosphere", label: "Atmosphere" },
  { key: "value", label: "Value" },
];

/** Leaderboard tabs (same categories as review ratings). */
export const LEADERBOARD_CATEGORIES = COLLEGE_REVIEW_CATEGORIES;

export type CollegeReviewRatings = {
  food: number;
  atmosphere: number;
  value: number;
  overall: number;
};

export type CollegeReviewSort = "recent" | "top";

export type CollegeReviewAuthor = {
  userId: string;
  name: string;
  college: string;
  year: string;
};

export type CollegeReviewVoteValue = 1 | -1;

export type CollegeReviewPublic = {
  id: string;
  listingId: string;
  college: string;
  ratings: CollegeReviewRatings;
  comment?: string;
  imageIds?: string[];
  imageUrls?: string[];
  isAnonymous: boolean;
  author: CollegeReviewAuthor | null;
  formalDateTime: string;
  createdAt: number;
  updatedAt: number;
  voteScore: number;
  viewerVote: CollegeReviewVoteValue | null;
};

export type CollegeReviewVoteState = {
  voteScore: number;
  viewerVote: CollegeReviewVoteValue | null;
};

/** Optimistic vote toggle; mirrors convex/collegeReviews voteReview. */
export function applyVoteToggle(
  state: CollegeReviewVoteState,
  direction: "up" | "down",
): CollegeReviewVoteState {
  const targetValue: CollegeReviewVoteValue = direction === "up" ? 1 : -1;
  const { voteScore, viewerVote } = state;

  if (viewerVote === null) {
    return { voteScore: voteScore + targetValue, viewerVote: targetValue };
  }
  if (viewerVote === targetValue) {
    return { voteScore: voteScore - targetValue, viewerVote: null };
  }
  return {
    voteScore: voteScore - viewerVote + targetValue,
    viewerVote: targetValue,
  };
}

/** Sort college review rows for list queries. */
export function sortCollegeReviewRows<
  T extends { voteScore?: number; _creationTime: number },
>(rows: T[], sort: CollegeReviewSort): T[] {
  const copy = [...rows];
  if (sort === "recent") {
    copy.sort((a, b) => b._creationTime - a._creationTime);
    return copy;
  }
  copy.sort((a, b) => {
    const diff = (b.voteScore ?? 0) - (a.voteScore ?? 0);
    if (diff !== 0) return diff;
    return b._creationTime - a._creationTime;
  });
  return copy;
}

export type CollegeAggregates = {
  college: string;
  reviewCount: number;
  averages: CollegeReviewRatings | null;
  attendanceCount: number;
  completedFormalCount: number;
  /** Overall-tab league position; null if no reviews or swap activity. */
  rank: number | null;
};

export type LeaderboardEntry = {
  college: string;
  reviewCount: number;
  average: number | null;
  rank: number | null;
  attendanceCount: number;
  completedFormalCount: number;
};

/** Sort ratings leaderboard: average desc, then guest attendance, then college name. */
export function compareRatingLeaderboardEntries(
  a: Pick<LeaderboardEntry, "college" | "average" | "attendanceCount">,
  b: Pick<LeaderboardEntry, "college" | "average" | "attendanceCount">,
): number {
  const avgDiff = (b.average ?? 0) - (a.average ?? 0);
  if (avgDiff !== 0) return avgDiff;
  const attendanceDiff = b.attendanceCount - a.attendanceCount;
  if (attendanceDiff !== 0) return attendanceDiff;
  return a.college.localeCompare(b.college);
}

export function isOverallLeaderboardRanked(
  entry: Pick<LeaderboardEntry, "average" | "attendanceCount">,
): boolean {
  return entry.average !== null || entry.attendanceCount > 0;
}

/**
 * Overall tab: rated colleges by average then attendance; colleges without
 * reviews but with guests rank by attendance below all reviewed colleges.
 */
export function compareOverallLeaderboardEntries(
  a: Pick<LeaderboardEntry, "college" | "average" | "attendanceCount">,
  b: Pick<LeaderboardEntry, "college" | "average" | "attendanceCount">,
): number {
  const aRated = a.average !== null;
  const bRated = b.average !== null;
  if (aRated && bRated) return compareRatingLeaderboardEntries(a, b);
  if (aRated && !bRated) return -1;
  if (!aRated && bRated) return 1;
  const attendanceDiff = b.attendanceCount - a.attendanceCount;
  if (attendanceDiff !== 0) return attendanceDiff;
  return a.college.localeCompare(b.college);
}

function ratingForCategory(
  ratings: CollegeReviewRatings,
  category: CollegeReviewCategory,
): number {
  return ratings[category];
}

export type LeaderboardCollegeInput = {
  reviewCount: number;
  averages: CollegeReviewRatings | null;
  attendanceCount: number;
  completedFormalCount: number;
};

export function statsToLeaderboardInput(stats: {
  reviewCount: number;
  ratingSums: CollegeReviewRatings;
  attendanceCount: number;
  completedFormalCount: number;
}): LeaderboardCollegeInput {
  const { reviewCount, ratingSums, attendanceCount, completedFormalCount } =
    stats;
  if (reviewCount === 0) {
    return {
      reviewCount: 0,
      averages: null,
      attendanceCount,
      completedFormalCount,
    };
  }
  return {
    reviewCount,
    averages: {
      food: ratingSums.food / reviewCount,
      atmosphere: ratingSums.atmosphere / reviewCount,
      value: ratingSums.value / reviewCount,
      overall: ratingSums.overall / reviewCount,
    },
    attendanceCount,
    completedFormalCount,
  };
}

/** Build ranked + unranked leaderboard entries for a category. */
export function buildLeaderboardEntries(
  colleges: readonly string[],
  dataByCollege: ReadonlyMap<string, LeaderboardCollegeInput>,
  category: CollegeReviewCategory,
): LeaderboardEntry[] {
  const entries = colleges.map((college) => {
    const data = dataByCollege.get(college);
    const base = {
      college,
      reviewCount: data?.reviewCount ?? 0,
      attendanceCount: data?.attendanceCount ?? 0,
      completedFormalCount: data?.completedFormalCount ?? 0,
      rank: null as number | null,
    };

    const averages = data?.averages ?? null;
    if (!averages) {
      return { ...base, average: null };
    }

    return { ...base, average: ratingForCategory(averages, category) };
  });

  const isOverall = category === "overall";
  const ranked = entries
    .filter((e) =>
      isOverall ? isOverallLeaderboardRanked(e) : e.average !== null,
    )
    .sort(
      isOverall
        ? compareOverallLeaderboardEntries
        : compareRatingLeaderboardEntries,
    );

  let rank = 1;
  for (const entry of ranked) {
    entry.rank = rank;
    rank += 1;
  }

  const unranked = entries
    .filter((e) =>
      isOverall ? !isOverallLeaderboardRanked(e) : e.average === null,
    )
    .sort((a, b) => a.college.localeCompare(b.college));

  return [...ranked, ...unranked];
}

export function leaderboardRankForCollege(
  entries: readonly LeaderboardEntry[],
  college: string,
): number | null {
  return entries.find((e) => e.college === college)?.rank ?? null;
}
