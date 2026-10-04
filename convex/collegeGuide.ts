import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  action,
  internalMutation,
  mutation,
  query,
  type QueryCtx,
} from "./_generated/server";
import { optionalUserId, requireActiveUser } from "./guards";
import { moderateText } from "./moderation";
import { normalizeCollegeName } from "../lib/data/colleges";

/**
 * A college's insider guide: formal nights, gowns, guest price, dress code,
 * and a few short tips. Only members of that college can edit it — they're
 * the ones who know.
 */

export const MAX_TIP_LENGTH = 140;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const gownsValidator = v.union(v.literal("yes"), v.literal("no"), v.literal("sometimes"));
const dressValidator = v.union(
  v.literal("smart"),
  v.literal("suit"),
  v.literal("blackTie"),
  v.literal("casual"),
);

async function isMemberOf(ctx: QueryCtx, userId: Id<"users"> | null, college: string) {
  if (!userId) return false;
  const user = await ctx.db.get(userId);
  return !!user?.college && normalizeCollegeName(user.college) === college;
}

export const getGuide = query({
  args: { college: v.string() },
  handler: async (ctx, args) => {
    const college = normalizeCollegeName(args.college);
    const viewerId = await optionalUserId(ctx);
    const guide = await ctx.db
      .query("collegeGuides")
      .withIndex("by_college", (q) => q.eq("college", college))
      .unique();
    const tipRows = await ctx.db
      .query("collegeTips")
      .withIndex("by_college", (q) => q.eq("college", college))
      .order("desc")
      .take(5);
    const tips = [];
    for (const tip of tipRows) {
      const author = await ctx.db.get(tip.userId);
      if (!author || author.deletedAt) continue;
      tips.push({
        id: tip._id,
        text: tip.text,
        authorFirstName: author.name?.split(" ")[0] ?? "A member",
        mine: tip.userId === viewerId,
      });
    }
    return {
      guide: guide
        ? {
            formalNights: guide.formalNights,
            gowns: guide.gowns ?? null,
            guestPrice: guide.guestPrice ?? null,
            dressCode: guide.dressCode ?? null,
          }
        : null,
      tips,
      canEdit: await isMemberOf(ctx, viewerId, college),
    };
  },
});

export const updateGuide = mutation({
  args: {
    college: v.string(),
    formalNights: v.array(v.string()),
    gowns: v.optional(gownsValidator),
    guestPrice: v.optional(v.number()),
    dressCode: v.optional(dressValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId } = await requireActiveUser(ctx);
    const college = normalizeCollegeName(args.college);
    if (!(await isMemberOf(ctx, userId, college))) {
      throw new ConvexError("Only members of this college can edit its guide.");
    }
    const nights = WEEKDAYS.filter((d) => args.formalNights.includes(d));
    if (
      args.guestPrice !== undefined &&
      (!Number.isFinite(args.guestPrice) || args.guestPrice < 0 || args.guestPrice > 200)
    ) {
      throw new ConvexError("Enter a guest price between £0 and £200.");
    }
    const fields = {
      college,
      formalNights: nights,
      gowns: args.gowns,
      guestPrice: args.guestPrice === undefined ? undefined : Math.round(args.guestPrice),
      dressCode: args.dressCode,
      updatedBy: userId,
      updatedAt: Date.now(),
    };
    const existing = await ctx.db
      .query("collegeGuides")
      .withIndex("by_college", (q) => q.eq("college", college))
      .unique();
    if (existing) await ctx.db.replace(existing._id, fields);
    else await ctx.db.insert("collegeGuides", fields);
    return null;
  },
});

/** Add a tip; checked by the same moderation as bios, and fails closed. */
export const addTip = action({
  args: { college: v.string(), text: v.string() },
  returns: v.union(
    v.object({ ok: v.literal(true) }),
    v.object({
      ok: v.literal(false),
      reason: v.union(
        v.literal("tooLong"),
        v.literal("empty"),
        v.literal("flagged"),
        v.literal("unavailable"),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");
    const text = args.text.replace(/\s+/g, " ").trim();
    if (!text) return { ok: false as const, reason: "empty" as const };
    if (text.length > MAX_TIP_LENGTH) return { ok: false as const, reason: "tooLong" as const };
    const verdict = await moderateText(text);
    if (verdict !== "clean") return { ok: false as const, reason: verdict };
    await ctx.runMutation(internal.collegeGuide.insertTip, {
      userId,
      college: args.college,
      text,
    });
    return { ok: true as const };
  },
});

export const insertTip = internalMutation({
  args: { userId: v.id("users"), college: v.string(), text: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const college = normalizeCollegeName(args.college);
    if (!(await isMemberOf(ctx, args.userId, college))) {
      throw new ConvexError("Only members of this college can add tips.");
    }
    await ctx.db.insert("collegeTips", {
      college,
      userId: args.userId,
      text: args.text,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const deleteTip = mutation({
  args: { tipId: v.id("collegeTips") },
  returns: v.null(),
  handler: async (ctx, { tipId }) => {
    const { userId } = await requireActiveUser(ctx);
    const tip = await ctx.db.get(tipId);
    if (!tip) return null;
    if (tip.userId !== userId) throw new ConvexError("You can only remove your own tips.");
    await ctx.db.delete(tipId);
    return null;
  },
});
