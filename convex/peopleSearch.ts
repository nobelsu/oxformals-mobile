import { v } from "convex/values";
import { query } from "./_generated/server";
import { blockedIdsFor } from "./blocks";
import { optionalUserId } from "./guards";
import { visibleAvatar } from "./userVisibility";

const RESULTS = 8;

/**
 * Find people by name, for the feed's search box. Signed-in only. Leaves out
 * yourself, deleted accounts, unfinished sign-ups and anyone blocked either
 * way; a private account you can't see shows initials, not their photo.
 */
export const searchPeople = query({
  args: { query: v.string() },
  returns: v.array(
    v.object({
      id: v.id("users"),
      name: v.string(),
      college: v.union(v.string(), v.null()),
      avatar: v.optional(
        v.union(
          v.object({ kind: v.literal("preset"), id: v.string() }),
          v.object({ kind: v.literal("image"), dataUrl: v.string() }),
        ),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const me = await optionalUserId(ctx);
    if (!me) return [];
    const text = args.query.trim();
    if (text.length < 2) return [];

    // Over-fetch: some matches are filtered out below.
    const matches = await ctx.db
      .query("users")
      .withSearchIndex("search_name", (q) => q.search("name", text))
      .take(RESULTS * 3);
    const blocked = await blockedIdsFor(ctx, me);
    const out = [];
    for (const u of matches) {
      if (out.length >= RESULTS) break;
      if (u._id === me || u.deletedAt !== undefined || blocked.has(u._id)) continue;
      const name = u.name?.trim();
      if (!name || !u.college?.trim()) continue;
      const avatar = await visibleAvatar(ctx, me, u);
      out.push({
        id: u._id,
        name,
        college: u.college.trim(),
        ...(avatar ? { avatar } : {}),
      });
    }
    return out;
  },
});
