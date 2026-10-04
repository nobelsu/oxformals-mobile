import { listingIsPast } from "./collegeReviewEligibility";
import { normalizeCollegeName } from "./colleges";

export type AttendanceListing = {
  college: string;
  dateTime: string;
  ownerUserId: string;
  members: string[];
};

export type AttendanceConfirmation = {
  listingId: string;
  college: string;
  dateTime: string;
  /** When false, row is excluded from rankings attendance. */
  attended?: boolean;
};

export type CollegeAttendanceStats = {
  attendanceCount: number;
  completedFormalCount: number;
};

/** @deprecated Use confirmation-based counting for rankings. */
export function guestCountForListing(listing: AttendanceListing): number {
  return listing.members.filter((id) => id !== listing.ownerUserId).length;
}

/** Guest seats filled at completed formals, grouped by college. */
export function computeAttendanceByCollege(
  listings: AttendanceListing[],
  nowMs: number,
): Map<string, CollegeAttendanceStats> {
  const map = new Map<string, CollegeAttendanceStats>();

  for (const listing of listings) {
    if (!listingIsPast(listing.dateTime, nowMs)) continue;

    const college = normalizeCollegeName(listing.college);
    if (!college) continue;

    const guests = guestCountForListing(listing);
    const prev = map.get(college) ?? {
      attendanceCount: 0,
      completedFormalCount: 0,
    };
    map.set(college, {
      attendanceCount: prev.attendanceCount + guests,
      completedFormalCount: prev.completedFormalCount + 1,
    });
  }

  return map;
}

/** Rankings attendance from explicit guest confirmations. */
export function computeAttendanceByCollegeFromConfirmations(
  confirmations: AttendanceConfirmation[],
  nowMs: number,
): Map<string, CollegeAttendanceStats> {
  const map = new Map<string, CollegeAttendanceStats>();
  const formalsCountedByCollege = new Map<string, Set<string>>();

  for (const row of confirmations) {
    if (!listingIsPast(row.dateTime, nowMs)) continue;
    if (row.attended === false) continue;

    const college = normalizeCollegeName(row.college);
    if (!college) continue;

    const prev = map.get(college) ?? {
      attendanceCount: 0,
      completedFormalCount: 0,
    };
    map.set(college, {
      attendanceCount: prev.attendanceCount + 1,
      completedFormalCount: prev.completedFormalCount,
    });

    let formals = formalsCountedByCollege.get(college);
    if (!formals) {
      formals = new Set();
      formalsCountedByCollege.set(college, formals);
    }
    if (!formals.has(row.listingId)) {
      formals.add(row.listingId);
      const stats = map.get(college)!;
      map.set(college, {
        ...stats,
        completedFormalCount: stats.completedFormalCount + 1,
      });
    }
  }

  return map;
}

export function getAttendanceForCollege(
  map: Map<string, CollegeAttendanceStats>,
  college: string,
): CollegeAttendanceStats {
  return (
    map.get(normalizeCollegeName(college)) ?? {
      attendanceCount: 0,
      completedFormalCount: 0,
    }
  );
}
