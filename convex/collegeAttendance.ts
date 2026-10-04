import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import {
  computeAttendanceByCollegeFromConfirmations,
  getAttendanceForCollege,
} from "../lib/data/collegeAttendance";
import { normalizeCollegeName, OXFORD_COLLEGES } from "../lib/data/colleges";
import { rowCountsAsAttended } from "../lib/data/formalAttendance";

export function buildAttendanceMapFromConfirmations(
  confirmations: Doc<"formalAttendanceConfirmations">[],
  listingsById: Map<string, Doc<"listings">>,
  nowMs: number,
) {
  const rows = confirmations
    .map((c) => {
      const listing = listingsById.get(c.listingId);
      if (!listing) return null;
      return {
        listingId: c.listingId,
        college: listing.college,
        dateTime: listing.dateTime,
        attended: rowCountsAsAttended(c) ? true : false,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return computeAttendanceByCollegeFromConfirmations(rows, nowMs);
}

/** Dev-only: log computed attendance per college in Convex dashboard. */
export const auditAttendance = internalMutation({
  args: { nowMs: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const confirmations = await ctx.db
      .query("formalAttendanceConfirmations")
      .collect();
    const listings = await ctx.db.query("listings").collect();
    const listingsById = new Map(listings.map((l) => [l._id, l]));
    const map = buildAttendanceMapFromConfirmations(
      confirmations,
      listingsById,
      args.nowMs,
    );
    for (const college of OXFORD_COLLEGES) {
      const stats = getAttendanceForCollege(map, college);
      if (stats.attendanceCount > 0 || stats.completedFormalCount > 0) {
        console.log(
          `${college}: ${stats.attendanceCount} confirmed guests, ${stats.completedFormalCount} formals`,
        );
      }
    }
    return null;
  },
});
