import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { mutation } from "./_generated/server";
import { requireActiveUser } from "./guards";

export const MAX_REPORT_DETAILS_LENGTH = 500;

export const reportReasonValidator = v.union(
  v.literal("spam"),
  v.literal("harassment"),
  v.literal("inappropriate"),
  v.literal("impersonation"),
  v.literal("other"),
);

const reportTargetValidator = v.union(
  v.object({ kind: v.literal("user"), userId: v.id("users") }),
  v.object({ kind: v.literal("listing"), listingId: v.id("listings") }),
  v.object({ kind: v.literal("comment"), commentId: v.id("feedComments") }),
  v.object({ kind: v.literal("message"), messageId: v.id("messages") }),
);

/**
 * Report a person, a listing, a feed comment or a chat message. The team is
 * emailed the first time each person reports a given thing; the reported
 * person is never told. A snapshot of the text is kept in case it's edited
 * or deleted afterwards.
 */
export const report = mutation({
  args: {
    target: reportTargetValidator,
    reason: reportReasonValidator,
    details: v.optional(v.string()),
  },
  returns: v.object({ alreadyReported: v.boolean() }),
  handler: async (ctx, { target, reason, details }) => {
    const { userId: reporterUserId } = await requireActiveUser(ctx);
    const trimmed = details?.trim() ?? "";
    if (trimmed.length > MAX_REPORT_DETAILS_LENGTH) {
      throw new ConvexError(
        `Keep the details under ${MAX_REPORT_DETAILS_LENGTH} characters.`,
      );
    }

    let targetKey: string;
    let reportedUserId: Id<"users">;
    let snapshot: string | undefined;
    if (target.kind === "user") {
      const user = await ctx.db.get(target.userId);
      if (!user || user.deletedAt !== undefined) {
        throw new ConvexError("That account no longer exists.");
      }
      targetKey = `user:${target.userId}`;
      reportedUserId = target.userId;
    } else if (target.kind === "listing") {
      const listing = await ctx.db.get(target.listingId);
      if (!listing) throw new ConvexError("That formal is no longer listed.");
      targetKey = `listing:${target.listingId}`;
      reportedUserId = listing.ownerUserId;
      snapshot = `${listing.college}: ${listing.message}`;
    } else if (target.kind === "comment") {
      const comment = await ctx.db.get(target.commentId);
      if (!comment) throw new ConvexError("That comment was deleted.");
      targetKey = `comment:${target.commentId}`;
      reportedUserId = comment.userId;
      snapshot = comment.text;
    } else {
      const message = await ctx.db.get(target.messageId);
      if (!message) throw new ConvexError("That message was deleted.");
      // Only someone in the chat can report what was said in it.
      const conversation = await ctx.db.get(message.conversationId);
      const inDm =
        conversation?.participantLow === reporterUserId ||
        conversation?.participantHigh === reporterUserId;
      const membership = inDm
        ? null
        : await ctx.db
            .query("conversationMembers")
            .withIndex("by_userId_and_conversationId", (q) =>
              q.eq("userId", reporterUserId).eq("conversationId", message.conversationId),
            )
            .unique();
      if (!inDm && !membership) {
        throw new ConvexError("You can only report messages in your own chats.");
      }
      targetKey = `message:${target.messageId}`;
      reportedUserId = message.senderUserId;
      snapshot = message.body;
    }

    if (reportedUserId === reporterUserId) {
      throw new ConvexError("You can't report yourself.");
    }

    const existing = await ctx.db
      .query("reports")
      .withIndex("by_reporterUserId_and_targetKey", (q) =>
        q.eq("reporterUserId", reporterUserId).eq("targetKey", targetKey),
      )
      .unique();
    if (existing) return { alreadyReported: true };

    const reportId = await ctx.db.insert("reports", {
      reporterUserId,
      reportedUserId,
      targetKey,
      reason,
      ...(trimmed ? { details: trimmed } : {}),
      ...(snapshot ? { snapshot: snapshot.slice(0, 2000) } : {}),
    });
    await ctx.scheduler.runAfter(0, internal.emails.sendReportEmail, { reportId });
    return { alreadyReported: false };
  },
});
