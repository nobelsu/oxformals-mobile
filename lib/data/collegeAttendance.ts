import { listingIsPast } from "./collegeReviewEligibility";
import { normalizeCollegeName } from "./colleges";

export type AttendanceListing = {
  college: string;
  dateTime: string;
  ownerUserId: string;
  members: string[];
};

export type CollegeAttendanceStats = {
  attendanceCount: number;
  completedFormalCount: number;
};

/** Guest seats filled at completed formals, grouped by college. */
export function guestCountForListing(listing: AttendanceListing): number {
  return listing.members.filter((id) => id !== listing.ownerUserId).length;
}

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
