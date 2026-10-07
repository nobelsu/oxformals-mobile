import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

/**
 * The landing page's "by the numbers" figures. Counting whole tables on every
 * visit would be wasteful, so a daily job counts once and the page reads the
 * stored result.
 */
export const get = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({ formals: v.number(), students: v.number() }),
  ),
  handler: async (ctx) => {
    const row = await ctx.db.query("siteStats").first();
    return row ? { formals: row.formals, students: row.students } : null;
  },
});

/** Recounts formals listed and people with a finished profile. */
export const recompute = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    let formals = 0;
    for await (const listing of ctx.db.query("listings")) {
      void listing;
      formals += 1;
    }
    let students = 0;
    for await (const user of ctx.db.query("users")) {
      if (user.deletedAt === undefined && user.college) students += 1;
    }
    const existing = await ctx.db.query("siteStats").first();
    const next = { formals, students, updatedAt: Date.now() };
    if (existing) await ctx.db.patch(existing._id, next);
    else await ctx.db.insert("siteStats", next);
    return null;
  },
});
