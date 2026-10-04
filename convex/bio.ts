import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation, mutation } from "./_generated/server";
import { MAX_BIO_LENGTH } from "./bioLimits";
import { requireActiveUser } from "./guards";
import { moderateText } from "./moderation";

const BACKFILL_PAGE = 100;

/** Trim each line, drop leading/trailing blank lines, allow at most one blank line in a row. */
export function normalizeBio(raw: string): string {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** "rowing · jazz · PPE", cut at a tag boundary to fit MAX_BIO_LENGTH. */
export function bioFromInterests(interests: string[]): string {
  let bio = "";
  for (const raw of interests) {
    const tag = raw.trim();
    if (!tag) continue;
    const next = bio ? `${bio} · ${tag}` : tag;
    if (next.length > MAX_BIO_LENGTH) break;
    bio = next;
  }
  return bio;
}

const saveBioResult = v.union(
  v.object({ ok: v.literal(true) }),
  v.object({
    ok: v.literal(false),
    reason: v.union(
      v.literal("tooLong"),
      v.literal("flagged"),
      v.literal("unavailable"),
    ),
  }),
);

/**
 * Save the signed-in user's bio after a moderation check; an empty bio clears
 * it without a check. Returns a result instead of throwing because Convex hides
 * thrown messages from clients in production.
 */
export const saveBio = action({
  args: { bio: v.string() },
  returns: saveBioResult,
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");
    const bio = normalizeBio(args.bio);
    if (bio.length > MAX_BIO_LENGTH) {
      return { ok: false as const, reason: "tooLong" as const };
    }
    if (bio) {
      const verdict = await moderateText(bio);
      if (verdict !== "clean") return { ok: false as const, reason: verdict };
    }
    await ctx.runMutation(internal.bio.setBio, { userId, bio });
    return { ok: true as const };
  },
});

export const setBio = internalMutation({
  args: { userId: v.id("users"), bio: v.string() },
  returns: v.null(),
  handler: async (ctx, { userId, bio }) => {
    const user = await ctx.db.get(userId);
    if (!user || user.deletedAt !== undefined) {
      throw new ConvexError("User not found");
    }
    await ctx.db.patch(userId, { bio });
    return null;
  },
});

/** One-off: give everyone with tags and no bio a bio made from their tags. */
export const backfillBioFromInterests = internalMutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  returns: v.null(),
  handler: async (ctx, { cursor }) => {
    const page = await ctx.db
      .query("users")
      .paginate({ cursor: cursor ?? null, numItems: BACKFILL_PAGE });
    for (const user of page.page) {
      if (user.bio !== undefined || user.deletedAt !== undefined) continue;
      const seeded = bioFromInterests(user.interests ?? []);
      if (seeded) await ctx.db.patch(user._id, { bio: seeded });
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.bio.backfillBioFromInterests, {
        cursor: page.continueCursor,
      });
    }
    return null;
  },
});

/** Report another user's bio. Emails the team the first time per reporter. */
export const reportBio = mutation({
  args: { userId: v.id("users") },
  returns: v.object({ alreadyReported: v.boolean() }),
  handler: async (ctx, { userId }) => {
    const { userId: reporterUserId } = await requireActiveUser(ctx);
    if (reporterUserId === userId) {
      throw new ConvexError("You can't report yourself.");
    }
    const target = await ctx.db.get(userId);
    if (!target || !target.bio) throw new ConvexError("There's no bio to report.");
    const existing = await ctx.db
      .query("bioReports")
      .withIndex("by_reportedUserId_and_reporterUserId", (q) =>
        q.eq("reportedUserId", userId).eq("reporterUserId", reporterUserId),
      )
      .unique();
    if (existing) return { alreadyReported: true };
    await ctx.db.insert("bioReports", {
      reportedUserId: userId,
      reporterUserId,
      bioText: target.bio,
    });
    await ctx.scheduler.runAfter(0, internal.emails.sendBioReportEmail, {
      reportedUserId: userId,
      bioText: target.bio,
    });
    return { alreadyReported: false };
  },
});

/** Operator-only: remove a bio (run from the CLI or dashboard). */
export const clearBio = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    await ctx.db.patch(userId, { bio: "" });
    return null;
  },
});
