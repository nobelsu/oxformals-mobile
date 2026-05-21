import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

const ADMIN_EMAIL = "admin@ox.ac.uk";
const ADMIN_PROVIDER_ID = "admin-email";

/** Remove stale admin-email auth rows so the next sign-in can recreate the user. */
export const resetAdminAuth = internalMutation({
  args: {},
  returns: v.union(v.literal("deleted"), v.literal("not_found")),
  handler: async (ctx) => {
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", ADMIN_PROVIDER_ID).eq("providerAccountId", ADMIN_EMAIL),
      )
      .unique();

    if (!account) {
      return "not_found";
    }

    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", account.userId))
      .collect();

    for (const session of sessions) {
      const refreshTokens = await ctx.db
        .query("authRefreshTokens")
        .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
        .collect();
      for (const token of refreshTokens) {
        await ctx.db.delete(token._id);
      }
      await ctx.db.delete(session._id);
    }

    await ctx.db.delete(account._id);
    return "deleted";
  },
});
