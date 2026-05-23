import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import {
  computeAttendanceByCollege,
  getAttendanceForCollege,
} from "../lib/data/collegeAttendance";
import { normalizeCollegeName, OXFORD_COLLEGES } from "../lib/data/colleges";

export function buildAttendanceMap(
  listings: Doc<"listings">[],
  nowMs: number,
) {
  return computeAttendanceByCollege(
    listings.map((l) => ({
      college: l.college,
      dateTime: l.dateTime,
      ownerUserId: l.ownerUserId,
      members: l.members.map(String),
    })),
    nowMs,
  );
}

export function attendanceForCollege(
  map: ReturnType<typeof buildAttendanceMap>,
  college: string,
) {
  return getAttendanceForCollege(map, college);
}

/** Dev-only: log computed attendance per college in Convex dashboard. */
export const auditAttendance = internalMutation({
  args: { nowMs: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const listings = await ctx.db.query("listings").collect();
    const map = buildAttendanceMap(listings, args.nowMs);
    for (const college of OXFORD_COLLEGES) {
      const stats = attendanceForCollege(map, college);
      if (stats.attendanceCount > 0 || stats.completedFormalCount > 0) {
        console.log(
          `${college}: ${stats.attendanceCount} guests, ${stats.completedFormalCount} formals`,
        );
      }
    }
    return null;
  },
});
