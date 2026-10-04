import { v } from "convex/values";
import {
  createAccount,
  getAuthSessionId,
  getAuthUserId,
  invalidateSessions,
  modifyAccountCredentials,
  retrieveAccount,
} from "@convex-dev/auth/server";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { requireUserId } from "./guards";
import { MIN_PASSWORD_LENGTH } from "./auth";

/** Whether the signed-in user has a password credential attached. */
export const hasPassword = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) =>
        q.eq("userId", userId).eq("provider", "password"),
      )
      .unique();
    return account !== null;
  },
});

/**
 * Attach a password to the currently authenticated (OTP-verified) user.
 *
 * The email is derived server-side from the session — never trusted from the
 * client — so a user can only set a password on their own account. Because the
 * user's email is already verified (OTP), `createAccount` links the new
 * `password` credential to the existing user instead of creating a duplicate.
 *
 * Must be an `action` because `createAccount` dispatches via `ctx.runMutation`.
 */
export const setPassword = action({
  args: { password: v.string() },
  returns: v.null(),
  handler: async (ctx, { password }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      );
    }

    const me = await ctx.runQuery(api.users.current);
    const email = me?.email?.trim();
    if (!email) {
      throw new Error("No verified email on this account.");
    }

    // Set-once: an existing password is changed with changePassword instead.
    if (await ctx.runQuery(api.password.hasPassword)) {
      throw new Error("Password already set");
    }

    await createAccount<DataModel>(ctx, {
      provider: "password",
      account: { id: email, secret: password },
      profile: { email },
      shouldLinkViaEmail: true,
      shouldLinkViaPhone: false,
    });

    return null;
  },
});

/**
 * Operator-only: attach a password to an existing account by email, e.g. the
 * App Store review account, which has no inbox to receive an OTP. Internal, so
 * it is not part of the client API — run it from the CLI or dashboard:
 *   npx convex run password:setPasswordForEmail '{"email":"…","password":"…"}'
 */
export const setPasswordForEmail = internalAction({
  args: { email: v.string(), password: v.string() },
  returns: v.null(),
  handler: async (ctx, { email, password }) => {
    const normalized = email.trim().toLowerCase();
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      );
    }
    const state = await ctx.runQuery(internal.password.passwordStateForEmail, {
      email: normalized,
    });
    if (!state.userExists) {
      throw new Error(`No user with email ${normalized}.`);
    }
    if (state.hasPassword) {
      throw new Error("Password already set");
    }

    await createAccount<DataModel>(ctx, {
      provider: "password",
      account: { id: normalized, secret: password },
      profile: { email: normalized },
      shouldLinkViaEmail: true,
      shouldLinkViaPhone: false,
    });

    return null;
  },
});

export const passwordStateForEmail = internalQuery({
  args: { email: v.string() },
  returns: v.object({ userExists: v.boolean(), hasPassword: v.boolean() }),
  handler: async (ctx, { email }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", email),
      )
      .unique();
    return { userExists: user !== null, hasPassword: account !== null };
  },
});

/** How recently you must have signed in to reset a password without the old one. */
const FRESH_SESSION_MS = 10 * 60 * 1000;

/** The signed-in user's email and when their current session started. */
export const sessionForPasswordChange = internalQuery({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      userId: v.id("users"),
      sessionId: v.id("authSessions"),
      sessionStartedAt: v.number(),
      email: v.union(v.string(), v.null()),
      /** The id the password credential is stored under, if there is one. */
      passwordAccountId: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    const sessionId = await getAuthSessionId(ctx);
    if (!userId || !sessionId) return null;
    const session = await ctx.db.get(sessionId);
    const user = await ctx.db.get(userId);
    if (!session || !user) return null;
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) =>
        q.eq("userId", userId).eq("provider", "password"),
      )
      .unique();
    return {
      passwordAccountId: account?.providerAccountId ?? null,
      userId,
      sessionId,
      sessionStartedAt: session._creationTime,
      email: user.email?.trim().toLowerCase() ?? null,
    };
  },
});

function assertPasswordOk(password: string) {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
}

/**
 * Change your password, proving you know the current one. Signs out your
 * other devices.
 */
export const changePassword = action({
  args: { current: v.string(), next: v.string() },
  returns: v.union(v.literal("ok"), v.literal("wrong_password")),
  handler: async (ctx, { current, next }) => {
    const me = await ctx.runQuery(internal.password.sessionForPasswordChange, {});
    if (!me) throw new Error("Not authenticated");
    if (!me.passwordAccountId) throw new Error("No password set");
    assertPasswordOk(next);
    try {
      const found = await retrieveAccount<DataModel>(ctx, {
        provider: "password",
        account: { id: me.passwordAccountId, secret: current },
      });
      if (!found || found.user._id !== me.userId) return "wrong_password";
    } catch {
      return "wrong_password";
    }
    await modifyAccountCredentials<DataModel>(ctx, {
      provider: "password",
      account: { id: me.passwordAccountId, secret: next },
    });
    await invalidateSessions<DataModel>(ctx, { userId: me.userId, except: [me.sessionId] });
    return "ok";
  },
});

/**
 * Set a new password without the old one. Only allowed right after signing in
 * (the client re-verifies an emailed code first), so a session left open on a
 * shared device can't be used to take the password over. Signs out your other
 * devices.
 */
export const resetPassword = action({
  args: { next: v.string() },
  returns: v.union(v.literal("ok"), v.literal("stale_session")),
  handler: async (ctx, { next }) => {
    const me = await ctx.runQuery(internal.password.sessionForPasswordChange, {});
    if (!me?.email) throw new Error("Not authenticated");
    assertPasswordOk(next);
    if (Date.now() - me.sessionStartedAt > FRESH_SESSION_MS) return "stale_session";

    if (me.passwordAccountId) {
      await modifyAccountCredentials<DataModel>(ctx, {
        provider: "password",
        account: { id: me.passwordAccountId, secret: next },
      });
    } else {
      await createAccount<DataModel>(ctx, {
        provider: "password",
        account: { id: me.email, secret: next },
        profile: { email: me.email },
        shouldLinkViaEmail: true,
        shouldLinkViaPhone: false,
      });
    }
    await invalidateSessions<DataModel>(ctx, { userId: me.userId, except: [me.sessionId] });
    return "ok";
  },
});

/** Drops the signed-in user's password credential. */
export const deletePasswordAccount = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) =>
        q.eq("userId", userId).eq("provider", "password"),
      )
      .unique();
    if (account) await ctx.db.delete(account._id);
    return null;
  },
});

/**
 * Remove your password, proving you know it. You sign in with an emailed code
 * from then on. Signs out your other devices.
 */
export const removePassword = action({
  args: { current: v.string() },
  returns: v.union(v.literal("ok"), v.literal("wrong_password")),
  handler: async (ctx, { current }) => {
    const me = await ctx.runQuery(internal.password.sessionForPasswordChange, {});
    if (!me) throw new Error("Not authenticated");
    if (!me.passwordAccountId) return "ok";
    try {
      const found = await retrieveAccount<DataModel>(ctx, {
        provider: "password",
        account: { id: me.passwordAccountId, secret: current },
      });
      if (!found || found.user._id !== me.userId) return "wrong_password";
    } catch {
      return "wrong_password";
    }
    await ctx.runMutation(internal.password.deletePasswordAccount, { userId: me.userId });
    await invalidateSessions<DataModel>(ctx, { userId: me.userId, except: [me.sessionId] });
    return "ok";
  },
});
