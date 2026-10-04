import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireActiveUser } from "./guards";

/** Toggle the viewer's like on a feed item; returns the new liked state. */
export const toggleLike = mutation({
  args: { targetKey: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const { userId } = await requireActiveUser(ctx);
    const existing = await ctx.db
      .query("feedLikes")
      .withIndex("by_targetKey_and_userId", (q) =>
        q.eq("targetKey", args.targetKey).eq("userId", userId),
      )
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
      return false;
    }
    await ctx.db.insert("feedLikes", { targetKey: args.targetKey, userId });
    return true;
  },
});
