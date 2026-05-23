import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { enrichListing } from "./listingHelpers";
import { DEFAULT_UI_FONT, uiFontValidator } from "./uiFont";
import { hasVerifiedEmail } from "./userVerification";
import {
  optionalUserId,
  requireUserId,
  requireVerifiedUser,
  sanitizePublicUser,
} from "./guards";

const avatarValue = v.union(
  v.object({ kind: v.literal("preset"), id: v.string() }),
  v.object({ kind: v.literal("image"), dataUrl: v.string() }),
);

const chatPickerUserValidator = v.object({
  _id: v.id("users"),
  name: v.optional(v.string()),
  college: v.optional(v.string()),
  avatar: v.optional(avatarValue),
});

const avatarOrClear = v.optional(v.union(avatarValue, v.null()));

async function syncCollegeWishlists(
  ctx: MutationCtx,
  userId: Id<"users">,
  colleges: string[],
): Promise<void> {
  const nextSet = new Set(colleges);
  const existing = await ctx.db
    .query("collegeWishlists")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();

  for (const row of existing) {
    if (!nextSet.has(row.college)) {
      await ctx.db.delete(row._id);
    }
  }

  const existingColleges = new Set(existing.map((row) => row.college));
  for (const college of nextSet) {
    if (!existingColleges.has(college)) {
      await ctx.db.insert("collegeWishlists", { userId, college });
    }
  }
}

function listingIsUpcoming(listing: Doc<"listings">, nowMs: number): boolean {
  const t = Date.parse(listing.dateTime);
  if (Number.isNaN(t)) return false;
  return t > nowMs;
}

async function requestHasUpcomingFormal(
  ctx: QueryCtx,
  req: Doc<"requests">,
  nowMs: number,
): Promise<boolean> {
  const target = await ctx.db.get(req.targetListingId);
  if (!target) return false;
  const requestType =
    req.requestType ?? (req.offeringListingId !== undefined ? "swap" : "pay");
  if (requestType === "pay") {
    return listingIsUpcoming(target, nowMs);
  }
  if (!req.offeringListingId) return false;
  const offering = await ctx.db.get(req.offeringListingId);
  if (!offering) return false;
  return listingIsUpcoming(target, nowMs) || listingIsUpcoming(offering, nowMs);
}

/** Whether the viewer may see profile contact fields for profileUserId (trusted server time). */
async function hasRevealableContact(
  ctx: QueryCtx,
  viewerId: Id<"users"> | null,
  profileUserId: Id<"users">,
  nowMs: number,
): Promise<boolean> {
  if (!viewerId) return false;
  if (viewerId === profileUserId) return true;

  const fromViewer = await ctx.db
    .query("requests")
    .withIndex("by_fromUserId", (q) => q.eq("fromUserId", viewerId))
    .take(200);
  for (const r of fromViewer) {
    if (r.status !== "accepted" || r.toUserId !== profileUserId) continue;
    if (await requestHasUpcomingFormal(ctx, r, nowMs)) {
      return true;
    }
  }

  const fromProfile = await ctx.db
    .query("requests")
    .withIndex("by_fromUserId", (q) => q.eq("fromUserId", profileUserId))
    .take(200);
  for (const r of fromProfile) {
    if (r.status !== "accepted" || r.toUserId !== viewerId) continue;
    if (await requestHasUpcomingFormal(ctx, r, nowMs)) {
      return true;
    }
  }

  return false;
}

export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await optionalUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").order("desc").take(500);
    return users.map(sanitizePublicUser);
  },
});

/** Verified users for the new-chat picker (minimal fields, auth required). */
export const listForChatPicker = query({
  args: {},
  returns: v.array(chatPickerUserValidator),
  handler: async (ctx) => {
    const viewerId = await optionalUserId(ctx);
    if (!viewerId) return [];

    const users = await ctx.db.query("users").order("desc").take(500);
    return users
      .filter((u) => u._id !== viewerId && hasVerifiedEmail(u))
      .map((u) => ({
        _id: u._id,
        name: u.name,
        college: u.college,
        avatar: u.avatar,
      }));
  },
});

/** Fetch specific users for request rows and profiles (not limited to listPublic page). */
export const getPublicByIds = query({
  args: { userIds: v.array(v.id("users")) },
  handler: async (ctx, args) => {
    const unique = [...new Set(args.userIds)].slice(0, 100);
    const users = await Promise.all(unique.map((id) => ctx.db.get(id)));
    return users
      .filter((user): user is Doc<"users"> => user !== null)
      .map(sanitizePublicUser);
  },
});

export const myWishlist = query({
  args: {},
  handler: async (ctx) => {
    const userId = await optionalUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user) return [];
    return user.wishlistColleges ?? [];
  },
});

export const completeOnboarding = mutation({
  args: {
    name: v.string(),
    college: v.string(),
    year: v.string(),
    role: v.string(),
    interests: v.optional(v.array(v.string())),
    instagramHandle: v.optional(v.string()),
    whatsappPhone: v.optional(v.string()),
    dietaryRequirements: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireVerifiedUser(ctx);

    const name = args.name.trim();
    const college = args.college.trim();
    const year = args.year.trim();
    const role = args.role.trim();
    if (!name || !college || !year || !role) {
      throw new Error("Missing required profile fields.");
    }

    await ctx.db.patch(userId, {
      name,
      college,
      year,
      role,
      interests: args.interests ?? [],
      instagramHandle: args.instagramHandle?.trim() || undefined,
      whatsappPhone: args.whatsappPhone?.trim() || undefined,
      dietaryRequirements: args.dietaryRequirements?.trim() ?? "",
      subject: "",
      uiFont: DEFAULT_UI_FONT,
    });

    return userId;
  },
});

export const agreeToRules = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    await ctx.db.patch(userId, { agreedToRules: true });
  },
});

export const patchProfile = mutation({
  args: {
    name: v.optional(v.string()),
    college: v.optional(v.string()),
    year: v.optional(v.string()),
    role: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    instagramHandle: v.optional(v.string()),
    whatsappPhone: v.optional(v.string()),
    dietaryRequirements: v.optional(v.string()),
    subject: v.optional(v.string()),
    uiFont: v.optional(uiFontValidator),
    avatar: avatarOrClear,
    emailWishlistAlerts: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireVerifiedUser(ctx);

    type UserPatch = Partial<
      Pick<
        Doc<"users">,
        | "name"
        | "college"
        | "year"
        | "role"
        | "interests"
        | "instagramHandle"
        | "whatsappPhone"
        | "dietaryRequirements"
        | "subject"
        | "uiFont"
        | "avatar"
        | "emailWishlistAlerts"
      >
    >;

    const patch: UserPatch = {};

    if (args.name !== undefined) {
      patch.name = args.name.trim() || undefined;
    }
    if (args.college !== undefined) {
      patch.college = args.college.trim() || undefined;
    }
    if (args.year !== undefined) {
      patch.year = args.year.trim() || undefined;
    }
    if (args.role !== undefined) {
      patch.role = args.role.trim() || undefined;
    }
    if (args.interests !== undefined) {
      patch.interests = args.interests;
    }
    if (args.instagramHandle !== undefined) {
      patch.instagramHandle = args.instagramHandle.trim() || undefined;
    }
    if (args.whatsappPhone !== undefined) {
      patch.whatsappPhone = args.whatsappPhone.trim() || undefined;
    }
    if (args.dietaryRequirements !== undefined) {
      patch.dietaryRequirements = args.dietaryRequirements.trim();
    }
    if (args.subject !== undefined) {
      patch.subject = args.subject.trim();
    }
    if (args.uiFont !== undefined) {
      patch.uiFont = args.uiFont;
    }
    if (args.avatar !== undefined) {
      patch.avatar =
        args.avatar === null ? undefined : (args.avatar as Doc<"users">["avatar"]);
    }
    if (args.emailWishlistAlerts !== undefined) {
      patch.emailWishlistAlerts = args.emailWishlistAlerts;
    }

    if (Object.keys(patch).length === 0) {
      throw new Error("No profile fields to update.");
    }

    await ctx.db.patch(userId, patch);

    const updated = await ctx.db.get(userId);
    if (!updated) {
      throw new Error("User profile not found.");
    }
    return updated._id;
  },
});

export const getPublicProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const viewerId = await optionalUserId(ctx);
    /* Trusted server time for contact privacy; client-supplied `now` would be spoofable. */
    const nowMs = Date.now();
    const revealContact = await hasRevealableContact(
      ctx,
      viewerId,
      args.userId,
      nowMs,
    );

    const activeListings = await ctx.db
      .query("listings")
      .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", args.userId))
      .take(200);

    return {
      user: {
        _id: user._id,
        name: user.name,
        college: user.college,
        year: user.year,
        role: user.role,
        interests: user.interests,
        ...(revealContact
          ? {
              instagramHandle: user.instagramHandle,
              whatsappPhone: user.whatsappPhone,
            }
          : {}),
        subject: user.subject ?? "",
        uiFont: user.uiFont ?? DEFAULT_UI_FONT,
        avatar: user.avatar,
      },
      listings: await Promise.all(
        activeListings
          .filter((l) => l.status === "active")
          .map((listing) => enrichListing(ctx, listing)),
      ),
    };
  },
});

export const toggleWishlistCollege = mutation({
  args: { college: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireVerifiedUser(ctx);

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User profile not found.");

    const college = args.college.trim();
    if (!college) throw new Error("College is required.");

    const current = user.wishlistColleges ?? [];
    const next = current.includes(college)
      ? current.filter((c) => c !== college)
      : [...current, college];

    await ctx.db.patch(userId, { wishlistColleges: next });
    await syncCollegeWishlists(ctx, userId, next);
    return next;
  },
});

export const saveWishlistColleges = mutation({
  args: { colleges: v.array(v.string()) },
  handler: async (ctx, args) => {
    const { userId } = await requireVerifiedUser(ctx);

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User profile not found.");

    const cleaned = Array.from(
      new Set(args.colleges.map((college) => college.trim()).filter(Boolean)),
    );
    await ctx.db.patch(userId, { wishlistColleges: cleaned });
    await syncCollegeWishlists(ctx, userId, cleaned);
    return cleaned;
  },
});

export const backfillEmailWishlistAlerts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    let patched = 0;
    for (const user of users) {
      if (user.emailWishlistAlerts !== true) {
        await ctx.db.patch(user._id, { emailWishlistAlerts: true });
        patched++;
      }
    }
    return { patched, total: users.length };
  },
});

export const backfillCollegeWishlists = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").take(100);
    let synced = 0;
    for (const user of users) {
      const colleges = user.wishlistColleges ?? [];
      if (colleges.length > 0) {
        await syncCollegeWishlists(ctx, user._id, colleges);
        synced++;
      }
    }
    if (users.length === 100) {
      await ctx.scheduler.runAfter(0, internal.users.backfillCollegeWishlists, {});
    }
    return { synced, scanned: users.length };
  },
});

export const backfillDietaryRequirements = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").take(100);
    let patched = 0;
    for (const user of users) {
      if (user.dietaryRequirements === undefined) {
        await ctx.db.patch(user._id, { dietaryRequirements: "" });
        patched++;
      }
    }
    if (patched === 100) {
      await ctx.scheduler.runAfter(0, internal.users.backfillDietaryRequirements, {});
    }
    return { patched };
  },
});

export const backfillUiFont = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").take(100);
    let patched = 0;
    for (const user of users) {
      if (user.uiFont === undefined) {
        await ctx.db.patch(user._id, { uiFont: DEFAULT_UI_FONT });
        patched++;
      }
    }
    if (users.length === 100) {
      await ctx.scheduler.runAfter(0, internal.users.backfillUiFont, {});
    }
    return { patched, scanned: users.length };
  },
});

export const backfillSubject = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").take(100);
    let patched = 0;
    for (const user of users) {
      if (user.subject === undefined) {
        await ctx.db.patch(user._id, { subject: "" });
        patched++;
      }
    }
    if (users.length === 100) {
      await ctx.scheduler.runAfter(0, internal.users.backfillSubject, {});
    }
    return { patched, scanned: users.length };
  },
});

