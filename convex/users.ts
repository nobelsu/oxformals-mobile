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
  sanitizeLimitedUser,
  sanitizePublicUser,
} from "./guards";
import { canSeeActivity, FOLLOW_LIST_LIMIT } from "./follows";
import { visibleAvatar } from "./userVisibility";
import { roleNeedsYear } from "./roles";

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

/**
 * Dietary requirements can reveal health or religion, so they're only stored
 * with an explicit opt-in to sharing them with formal matches.
 *
 * - `consent: true` stores the text (and when they first agreed).
 * - `consent: false`, or clearing the text, withdraws: text and consent go.
 * - No consent given: new text isn't stored. A legacy value saved before the
 *   opt-in existed stays until they next change it (the editor asks then).
 */
function dietaryPatch(
  user: Doc<"users">,
  text: string,
  consent: boolean | undefined,
): Partial<Pick<Doc<"users">, "dietaryRequirements" | "dietaryConsentAt">> {
  const trimmed = text.trim();
  if (consent === false || trimmed === "") {
    return { dietaryRequirements: "", dietaryConsentAt: undefined };
  }
  if (consent === true) {
    return {
      dietaryRequirements: trimmed,
      dietaryConsentAt: user.dietaryConsentAt ?? Date.now(),
    };
  }
  if (user.dietaryConsentAt !== undefined) {
    return { dietaryRequirements: trimmed };
  }
  return {};
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

/**
 * Members the signed-in app resolves names and avatars from. Signed-in only;
 * private accounts are left out unless it's you or someone you follow (they
 * come back, limited, through `getPublicByIds` when a listing needs them).
 */
export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const viewerId = await optionalUserId(ctx);
    if (!viewerId) return [];
    const following = new Set(
      (
        await ctx.db
          .query("follows")
          .withIndex("by_followerId_and_status", (q) =>
            q.eq("followerId", viewerId).eq("status", "active"),
          )
          .take(FOLLOW_LIST_LIMIT)
      ).map((f) => f.followeeId),
    );
    const users = await ctx.db.query("users").order("desc").take(500);
    return users
      .filter(
        (u) =>
          u.deletedAt === undefined &&
          (u.isPrivate !== true || u._id === viewerId || following.has(u._id)),
      )
      .map(sanitizePublicUser);
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
    const picked = users.filter(
      (u) =>
        u._id !== viewerId && u.deletedAt === undefined && hasVerifiedEmail(u),
    );
    return await Promise.all(
      picked.map(async (u) => {
        const avatar = await visibleAvatar(ctx, viewerId, u);
        return {
          _id: u._id,
          name: u.name,
          college: u.college,
          ...(avatar ? { avatar } : {}),
        };
      }),
    );
  },
});

/**
 * Fetch specific users for request rows, listing hosts and members (not
 * limited to the listPublic page). Signed-in only; a private account the
 * viewer doesn't follow comes back limited to name, college, year and role.
 */
export const getPublicByIds = query({
  args: { userIds: v.array(v.id("users")) },
  handler: async (ctx, args) => {
    const viewerId = await optionalUserId(ctx);
    if (!viewerId) return [];
    const unique = [...new Set(args.userIds)].slice(0, 100);
    const users = await Promise.all(unique.map((id) => ctx.db.get(id)));
    const out = [];
    for (const user of users) {
      if (!user) continue;
      out.push(
        (await canSeeActivity(ctx, viewerId, user))
          ? sanitizePublicUser(user)
          : sanitizeLimitedUser(user),
      );
    }
    return out;
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
    dietaryConsent: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireVerifiedUser(ctx);

    const name = args.name.trim();
    const college = args.college.trim();
    const role = args.role.trim();
    // Fellows have no year of study; store it empty.
    const year = roleNeedsYear(role) ? args.year.trim() : "";
    if (!name || !college || !role || (roleNeedsYear(role) && !year)) {
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
      dietaryRequirements: "",
      ...dietaryPatch(
        user,
        args.dietaryRequirements ?? "",
        args.dietaryConsent,
      ),
      subject: "",
      uiFont: DEFAULT_UI_FONT,
    });

    return userId;
  },
});

/**
 * Finishing onboarding: accepts the Terms and Privacy policy. Keeps its old
 * name so older clients (and the mobile app) still work; records when.
 */
export const agreeToRules = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    await ctx.db.patch(userId, {
      agreedToRules: true,
      agreedToTermsAt: Date.now(),
    });
    return null;
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
    /** Opt-in to share dietary requirements with formal matches. */
    dietaryConsent: v.optional(v.boolean()),
    subject: v.optional(v.string()),
    uiFont: v.optional(uiFontValidator),
    avatar: avatarOrClear,
    emailNotifications: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireVerifiedUser(ctx);

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
        | "dietaryConsentAt"
        | "subject"
        | "uiFont"
        | "avatar"
        | "emailNotifications"
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
      // Becoming a fellow clears the year of study.
      if (patch.role && !roleNeedsYear(patch.role)) patch.year = undefined;
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
    if (
      args.dietaryRequirements !== undefined ||
      args.dietaryConsent !== undefined
    ) {
      Object.assign(
        patch,
        dietaryPatch(
          user,
          args.dietaryRequirements ?? user.dietaryRequirements ?? "",
          args.dietaryConsent,
        ),
      );
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
    if (args.emailNotifications !== undefined) {
      patch.emailNotifications = args.emailNotifications;
    }

    // Dietary text without consent is dropped rather than refused, so a
    // patch can legitimately end up empty.
    const touchedDietary =
      args.dietaryRequirements !== undefined ||
      args.dietaryConsent !== undefined;
    if (Object.keys(patch).length === 0 && !touchedDietary) {
      throw new Error("No profile fields to update.");
    }

    if (Object.keys(patch).length > 0) await ctx.db.patch(userId, patch);

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
    if (!user || user.deletedAt !== undefined) return null;

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

    // A private account shows only who they are (name, college, year, role,
    // initials avatar) unless the viewer is them, an approved follower, or
    // matched with them on an upcoming formal. Follow counts and the
    // Follow/Request button come from `follows.getFollowState`.
    const canSee = await canSeeActivity(ctx, viewerId, user);
    const shown =
      canSee || revealContact
        ? sanitizePublicUser(user)
        : sanitizeLimitedUser(user);

    return {
      user: {
        ...shown,
        ...(revealContact
          ? {
              instagramHandle: user.instagramHandle,
              whatsappPhone: user.whatsappPhone,
              // Dietary requirements are PII: only reveal to the profile owner or
              // a matched counterparty (same gate as contact details).
              dietaryRequirements: user.dietaryRequirements ?? "",
            }
          : {}),
        uiFont: user.uiFont ?? DEFAULT_UI_FONT,
        // Colleges they want to go to — part of their activity, so private
        // accounts only show it to followers.
        wishlistColleges: canSee ? (user.wishlistColleges ?? []) : [],
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

export const backfillEmailNotifications = internalMutation({
  args: {},
  returns: v.object({ patched: v.number(), total: v.number() }),
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    let patched = 0;
    for (const user of users) {
      if (user.emailNotifications !== undefined) continue;
      const enabled = user.emailWishlistAlerts !== false;
      await ctx.db.patch(user._id, { emailNotifications: enabled });
      patched++;
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

