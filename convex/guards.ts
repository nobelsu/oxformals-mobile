import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { hasVerifiedEmail } from "./userVerification";
import { ConvexError } from "convex/values";

type Ctx = QueryCtx | MutationCtx;

const DEFAULT_ADMIN_EMAIL = "admin@ox.ac.uk";

export async function optionalUserId(ctx: Ctx): Promise<Id<"users"> | null> {
  return await getAuthUserId(ctx);
}

export async function requireUserId(ctx: Ctx): Promise<Id<"users">> {
  const userId = await optionalUserId(ctx);
  if (!userId) throw new ConvexError("Not authenticated");
  return userId;
}

export async function requireUser(
  ctx: Ctx,
): Promise<{ userId: Id<"users">; user: Doc<"users"> }> {
  const userId = await requireUserId(ctx);
  const user = await ctx.db.get(userId);
  if (!user) throw new ConvexError("User profile not found");
  return { userId, user };
}

export async function requireVerifiedUser(
  ctx: Ctx,
): Promise<{ userId: Id<"users">; user: Doc<"users"> }> {
  const result = await requireUser(ctx);
  if (!hasVerifiedEmail(result.user)) {
    throw new ConvexError("Please verify your email before using this feature.");
  }
  return result;
}

export async function requireActiveUser(
  ctx: Ctx,
): Promise<{ userId: Id<"users">; user: Doc<"users"> }> {
  const result = await requireVerifiedUser(ctx);
  if (result.user.agreedToRules !== true) {
    throw new ConvexError("Please agree to the rules before using this feature.");
  }
  return result;
}

export function assertOwner(
  ownerUserId: Id<"users">,
  userId: Id<"users">,
  message: string,
): void {
  if (ownerUserId !== userId) {
    throw new ConvexError(message);
  }
}

export function assertParticipant(
  participants: Id<"users">[],
  userId: Id<"users">,
  message: string,
): void {
  if (!participants.includes(userId)) {
    throw new ConvexError(message);
  }
}

export function assertAdmin(user: Doc<"users">): void {
  const adminEmail = (process.env.ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL)
    .trim()
    .toLowerCase();
  const email = user.email?.trim().toLowerCase() ?? "";
  if (email !== adminEmail) {
    throw new ConvexError("Admin privileges required.");
  }
}

export function sanitizePublicUser(user: Doc<"users">) {
  return {
    _id: user._id,
    name: user.name,
    college: user.college,
    year: user.year,
    role: user.role,
    interests: user.interests,
    bio: user.bio ?? "",
    subject: user.subject ?? "",
    uiFont: user.uiFont,
    avatar: user.avatar,
  };
}

/**
 * A private account seen by someone who can't see their activity: who they
 * are (name, college, year) but nothing about them. Same shape as
 * `sanitizePublicUser` so callers don't branch.
 */
export function sanitizeLimitedUser(user: Doc<"users">) {
  return {
    ...sanitizePublicUser(user),
    interests: [],
    bio: "",
    subject: "",
    avatar: undefined,
  };
}
