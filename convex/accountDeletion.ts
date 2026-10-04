import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { optionalUserId, requireUser } from "./guards";
import {
  declinePendingRequestsForListing,
  deleteMenuPdfIfPresent,
  listingIsPast,
} from "./listingHelpers";
import { removeUserFromListingGroup } from "./listingMembership";
import { refundListingCredits } from "./credits";

/** Per-table bound; an account never comes close to this many rows. */
const MAX_ROWS = 1000;

/** Rows changed per `purgeUserContent` run; it reschedules itself until done. */
const PURGE_BATCH = 200;

type Notice = {
  kind: "hostLeft" | "guestLeft";
  toEmail: string;
  college: string;
  dateTime: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Upcoming formals the user hosts, upcoming formals they joined, and their requests. */
async function upcomingFormals(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
) {
  const nowMs = Date.now();
  const owned = await ctx.db
    .query("listings")
    .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", userId))
    .take(MAX_ROWS);
  const hosting = owned.filter((l) => !listingIsPast(l.dateTime, nowMs));

  // A guest joins a formal through an accepted request: as the requester for
  // the target listing, or as the host of a swap for the offering listing.
  const candidateIds = new Set<Id<"listings">>();
  const sent = await ctx.db
    .query("requests")
    .withIndex("by_fromUserId", (q) => q.eq("fromUserId", userId))
    .take(MAX_ROWS);
  for (const r of sent) {
    if (r.status === "accepted") candidateIds.add(r.targetListingId);
  }
  const received = await ctx.db
    .query("requests")
    .withIndex("by_toUserId", (q) => q.eq("toUserId", userId))
    .take(MAX_ROWS);
  for (const r of received) {
    if (r.status === "accepted" && r.offeringListingId) {
      candidateIds.add(r.offeringListingId);
    }
  }
  const joined: Doc<"listings">[] = [];
  for (const id of candidateIds) {
    const l = await ctx.db.get(id);
    if (
      l &&
      l.ownerUserId !== userId &&
      l.members.includes(userId) &&
      !listingIsPast(l.dateTime, nowMs)
    ) {
      joined.push(l);
    }
  }
  return { hosting, joined, sent, received };
}

/** What deleting the signed-in account would affect, for the confirmation screen. */
export const getDeletionImpact = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      email: v.string(),
      hosting: v.array(
        v.object({
          listingId: v.id("listings"),
          college: v.string(),
          dateTime: v.string(),
          guestCount: v.number(),
        }),
      ),
      joined: v.array(
        v.object({
          listingId: v.id("listings"),
          college: v.string(),
          dateTime: v.string(),
        }),
      ),
      pendingRequests: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const userId = await optionalUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user || user.deletedAt !== undefined || !user.email) return null;

    const { hosting, joined, sent, received } = await upcomingFormals(
      ctx,
      userId,
    );
    return {
      email: user.email,
      hosting: hosting.map((l) => ({
        listingId: l._id,
        college: l.college,
        dateTime: l.dateTime,
        guestCount: l.members.filter((m) => m !== userId).length,
      })),
      joined: joined.map((l) => ({
        listingId: l._id,
        college: l.college,
        dateTime: l.dateTime,
      })),
      pendingRequests: [...sent, ...received].filter(
        (r) => r.status === "pending",
      ).length,
    };
  },
});

async function emailOf(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<string | null> {
  const user = await ctx.db.get(userId);
  return user && user.deletedAt === undefined && user.email
    ? user.email
    : null;
}

/**
 * Permanently delete the signed-in account. Personal data is removed and the
 * user row becomes a "Deleted user" placeholder, so messages, reviews and past
 * formals still resolve. Upcoming formals are tidied up and the people affected
 * are emailed.
 */
export const deleteMyAccount = mutation({
  args: { confirmEmail: v.string() },
  returns: v.null(),
  handler: async (ctx, { confirmEmail }) => {
    const { userId, user } = await requireUser(ctx);
    if (
      !user.email ||
      normalizeEmail(confirmEmail) !== normalizeEmail(user.email)
    ) {
      throw new ConvexError("That email doesn't match your account.");
    }

    const notices: Notice[] = [];
    const { hosting, joined, sent, received } = await upcomingFormals(
      ctx,
      userId,
    );

    // 1. Upcoming formals they host are cancelled; each guest is told.
    for (const listing of hosting) {
      for (const guestId of listing.members) {
        if (guestId === userId) continue;
        const toEmail = await emailOf(ctx, guestId);
        if (toEmail) {
          notices.push({
            kind: "hostLeft",
            toEmail,
            college: listing.college,
            dateTime: listing.dateTime,
          });
        }
      }
      await declinePendingRequestsForListing(ctx, listing._id);
      await refundListingCredits(ctx, listing._id);
      await deleteMenuPdfIfPresent(ctx, listing.menuPdfId);
      await ctx.db.delete(listing._id);
    }

    // 2. Upcoming formals they joined get the seat back; the host is told.
    for (const listing of joined) {
      await removeUserFromListingGroup(ctx, listing._id, userId);
      const toEmail = await emailOf(ctx, listing.ownerUserId);
      if (toEmail) {
        notices.push({
          kind: "guestLeft",
          toEmail,
          college: listing.college,
          dateTime: listing.dateTime,
        });
      }
    }

    // 3. Requests still pending, sent or received, are declined.
    for (const r of [...sent, ...received]) {
      const fresh = await ctx.db.get(r._id);
      if (fresh?.status === "pending") {
        await ctx.db.patch(r._id, { status: "declined" });
      }
    }

    // 4. Personal rows.
    const deleteByUserId = async (
      table:
        | "collegeWishlists"
        | "feedLikes"
        | "feedBookmarks"
        | "pushTokens"
        | "userBadges",
    ) => {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .take(MAX_ROWS);
      for (const row of rows) await ctx.db.delete(row._id);
    };
    await deleteByUserId("collegeWishlists");
    await deleteByUserId("feedLikes");
    await deleteByUserId("feedBookmarks");
    await deleteByUserId("pushTokens");
    await deleteByUserId("userBadges");
    for (const status of ["active", "pending"] as const) {
      for (const row of await ctx.db
        .query("follows")
        .withIndex("by_followerId_and_status", (q) =>
          q.eq("followerId", userId).eq("status", status),
        )
        .take(MAX_ROWS)) {
        await ctx.db.delete(row._id);
      }
      for (const row of await ctx.db
        .query("follows")
        .withIndex("by_followeeId_and_status", (q) =>
          q.eq("followeeId", userId).eq("status", status),
        )
        .take(MAX_ROWS)) {
        await ctx.db.delete(row._id);
      }
    }

    // 5. Sign-in records: accounts (+ codes) and sessions (+ refresh tokens).
    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
      .take(MAX_ROWS);
    for (const account of accounts) {
      const codes = await ctx.db
        .query("authVerificationCodes")
        .withIndex("accountId", (q) => q.eq("accountId", account._id))
        .take(MAX_ROWS);
      for (const c of codes) await ctx.db.delete(c._id);
      await ctx.db.delete(account._id);
    }
    // Failed sign-in counters are keyed by email (the account id).
    const identifiers = new Set(
      [user.email, ...accounts.map((a) => a.providerAccountId)].map(
        normalizeEmail,
      ),
    );
    for (const identifier of identifiers) {
      const limits = await ctx.db
        .query("authRateLimits")
        .withIndex("identifier", (q) => q.eq("identifier", identifier))
        .take(MAX_ROWS);
      for (const row of limits) await ctx.db.delete(row._id);
    }
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .take(MAX_ROWS);
    for (const session of sessions) {
      const tokens = await ctx.db
        .query("authRefreshTokens")
        .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
        .take(MAX_ROWS);
      for (const token of tokens) await ctx.db.delete(token._id);
      await ctx.db.delete(session._id);
    }

    // 6. Scrub the profile to a placeholder messages and reviews still point at.
    await ctx.db.replace(userId, {
      name: "Deleted user",
      deletedAt: Date.now(),
    });

    // 7. Everything they wrote or uploaded, in batches (see purgeUserContent).
    await ctx.scheduler.runAfter(0, internal.accountDeletion.purgeUserContent, {
      userId,
    });

    if (notices.length > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.emails.sendAccountDeletionNotices,
        { notices },
      );
    }
    return null;
  },
});

/**
 * The rest of a deleted account's content, a batch at a time so a heavy user
 * stays inside Convex's per-transaction limits. Each step spends from one
 * budget of row writes; when it runs out, the mutation schedules itself again
 * and every step re-checks what's left (all steps are idempotent).
 *
 * Deleted: feed comments, bio reports about or by them (they hold a copy of
 * the bio), college tips, review votes and reports, party invites, the credit
 * balance, browser push subscriptions, their notifications, their invite
 * code and seat links, and every uploaded file (review photos, menu PDFs).
 * Pending referrals to or from them are voided.
 * Blanked: free text on their requests and attendance "other" reasons; their
 * id on a college guide they last edited.
 * Kept on purpose (documented in the privacy policy): reviews (author shows as
 * "Deleted user"), messages in other people's chats, credit holds (the ledger
 * other people's balances depend on) and swap-break records (abuse history),
 * until the limits in convex/retention.ts remove them.
 */
export const purgeUserContent = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    let budget = PURGE_BATCH;
    const spent = () => budget <= 0;

    // Reviews stay, their photos go (photos can show the person).
    for await (const review of ctx.db
      .query("collegeReviews")
      .withIndex("by_userId", (q) => q.eq("userId", userId))) {
      if (spent()) break;
      if (!review.imageIds?.length) continue;
      for (const imageId of review.imageIds) {
        if (await ctx.db.system.get("_storage", imageId)) {
          await ctx.storage.delete(imageId);
        }
      }
      await ctx.db.patch(review._id, { imageIds: undefined });
      budget--;
    }

    // Uploaded blobs (the review photos above, menu PDFs) and their bookkeeping.
    for await (const file of ctx.db
      .query("uploadedFiles")
      .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", userId))) {
      if (spent()) break;
      if (await ctx.db.system.get("_storage", file.storageId)) {
        await ctx.storage.delete(file.storageId);
      }
      await ctx.db.delete(file._id);
      budget--;
    }

    // Votes: undo their effect on the review's score, then delete.
    for await (const vote of ctx.db
      .query("collegeReviewVotes")
      .withIndex("by_userId", (q) => q.eq("userId", userId))) {
      if (spent()) break;
      const review = await ctx.db.get(vote.reviewId);
      if (review) {
        await ctx.db.patch(review._id, {
          voteScore: (review.voteScore ?? 0) - vote.value,
        });
      }
      await ctx.db.delete(vote._id);
      budget--;
    }

    const deleteAll = async (
      rows: AsyncIterable<{ _id: Id<TableWithRows> }>,
    ) => {
      for await (const row of rows) {
        if (spent()) return;
        await ctx.db.delete(row._id);
        budget--;
      }
    };
    await deleteAll(
      ctx.db
        .query("feedComments")
        .withIndex("by_userId", (q) => q.eq("userId", userId)),
    );
    await deleteAll(
      ctx.db
        .query("bioReports")
        .withIndex("by_reportedUserId_and_reporterUserId", (q) =>
          q.eq("reportedUserId", userId),
        ),
    );
    await deleteAll(
      ctx.db
        .query("bioReports")
        .withIndex("by_reporterUserId", (q) => q.eq("reporterUserId", userId)),
    );
    await deleteAll(
      ctx.db
        .query("reports")
        .withIndex("by_reportedUserId", (q) => q.eq("reportedUserId", userId)),
    );
    await deleteAll(
      ctx.db
        .query("reports")
        .withIndex("by_reporterUserId_and_targetKey", (q) =>
          q.eq("reporterUserId", userId),
        ),
    );
    await deleteAll(
      ctx.db
        .query("collegeTips")
        .withIndex("by_userId", (q) => q.eq("userId", userId)),
    );
    await deleteAll(
      ctx.db
        .query("collegeReviewReports")
        .withIndex("by_reporterUserId", (q) => q.eq("reporterUserId", userId)),
    );
    await deleteAll(
      ctx.db
        .query("partyInvites")
        .withIndex("by_userId", (q) => q.eq("userId", userId)),
    );
    await deleteAll(
      ctx.db
        .query("creditAccounts")
        .withIndex("by_userId", (q) => q.eq("userId", userId)),
    );
    await deleteAll(
      ctx.db
        .query("webPushSubscriptions")
        .withIndex("by_userId", (q) => q.eq("userId", userId)),
    );
    await deleteAll(
      ctx.db
        .query("notifications")
        .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", userId)),
    );
    await deleteAll(
      ctx.db
        .query("inviteCodes")
        .withIndex("by_userId", (q) => q.eq("userId", userId)),
    );
    // Referrals keep the inviter's cap honest, so they stay, but can't pay.
    for await (const r of ctx.db
      .query("referrals")
      .withIndex("by_inviterId_and_status", (q) =>
        q.eq("inviterId", userId).eq("status", "pending"),
      )) {
      if (spent()) break;
      await ctx.db.patch(r._id, { status: "void" });
      budget--;
    }
    for await (const r of ctx.db
      .query("referrals")
      .withIndex("by_inviteeId", (q) => q.eq("inviteeId", userId))) {
      if (spent()) break;
      if (r.status !== "pending") continue;
      await ctx.db.patch(r._id, { status: "void" });
      budget--;
    }

    // Seat links they sent out: the tokens stop working.
    for await (const r of ctx.db
      .query("requests")
      .withIndex("by_fromUserId", (q) => q.eq("fromUserId", userId))) {
      if (spent()) break;
      await deleteAll(
        ctx.db
          .query("seatLinks")
          .withIndex("by_requestId", (q) => q.eq("requestId", r._id)),
      );
    }

    // Free text they wrote on requests other people still see.
    for await (const r of ctx.db
      .query("requests")
      .withIndex("by_fromUserId", (q) => q.eq("fromUserId", userId))) {
      if (spent()) break;
      if (r.message === "") continue;
      await ctx.db.patch(r._id, { message: "" });
      budget--;
    }
    for await (const row of ctx.db
      .query("formalAttendanceConfirmations")
      .withIndex("by_userId", (q) => q.eq("userId", userId))) {
      if (spent()) break;
      if (row.reasonOther === undefined) continue;
      await ctx.db.patch(row._id, { reasonOther: undefined });
      budget--;
    }
    // One guide per college, so this table is small.
    for (const guide of await ctx.db.query("collegeGuides").take(MAX_ROWS)) {
      if (spent()) break;
      if (guide.updatedBy !== userId) continue;
      await ctx.db.patch(guide._id, { updatedBy: undefined });
      budget--;
    }

    if (spent()) {
      await ctx.scheduler.runAfter(
        0,
        internal.accountDeletion.purgeUserContent,
        { userId },
      );
    }
    return null;
  },
});

type TableWithRows =
  | "feedComments"
  | "bioReports"
  | "reports"
  | "collegeTips"
  | "collegeReviewReports"
  | "partyInvites"
  | "creditAccounts"
  | "webPushSubscriptions"
  | "notifications"
  | "inviteCodes"
  | "seatLinks";
