import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireActiveUser } from "./guards";

/** Toggle the viewer's bookmark on a feed item; returns the new saved state. */
export const toggleBookmark = mutation({
  args: { targetKey: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const { userId } = await requireActiveUser(ctx);
    const existing = await ctx.db
      .query("feedBookmarks")
      .withIndex("by_targetKey_and_userId", (q) =>
        q.eq("targetKey", args.targetKey).eq("userId", userId),
      )
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
      return false;
    }
    await ctx.db.insert("feedBookmarks", { targetKey: args.targetKey, userId });
    return true;
  },
});
