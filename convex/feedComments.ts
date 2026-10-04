import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { optionalUserId, requireActiveUser } from "./guards";
import { visibleUser } from "./userVisibility";
import { MAX_FEED_COMMENT_LENGTH } from "../lib/data/feedConstants";

/** All comments on one feed item (its `targetKey`), oldest first, author-enriched. */
export const listComments = query({
  args: { targetKey: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("feedComments")
      .withIndex("by_targetKey", (q) => q.eq("targetKey", args.targetKey))
      .collect();
    rows.sort((a, b) => a._creationTime - b._creationTime);

    const viewerId = await optionalUserId(ctx);
    return Promise.all(
      rows.map(async (row) => {
        const user = await ctx.db.get(row.userId);
        return {
          id: row._id,
          text: row.text,
          ts: row._creationTime,
          // A private author the viewer can't see: name and initials only.
          author: user ? await visibleUser(ctx, viewerId, user) : null,
          isMine: viewerId !== null && viewerId === row.userId,
        };
      }),
    );
  },
});

export const addComment = mutation({
  args: { targetKey: v.string(), text: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireActiveUser(ctx);
    const text = args.text.trim();
    if (!text) throw new Error("Comment can't be empty.");
    if (text.length > MAX_FEED_COMMENT_LENGTH) {
      throw new Error("Comment is too long.");
    }
    return await ctx.db.insert("feedComments", {
      targetKey: args.targetKey,
      userId,
      text,
    });
  },
});

export const deleteComment = mutation({
  args: { commentId: v.id("feedComments") },
  handler: async (ctx, args) => {
    const { userId } = await requireActiveUser(ctx);
    const comment = await ctx.db.get(args.commentId);
    if (!comment) return;
    if (comment.userId !== userId) {
      throw new Error("You can only delete your own comments.");
    }
    await ctx.db.delete(args.commentId);
  },
});
