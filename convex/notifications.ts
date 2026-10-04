import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { optionalUserId, requireActiveUser } from "./guards";
import { visibleAvatar } from "./userVisibility";
import {
  EMAIL_NOTICE_KINDS,
  renderNotification,
  type NotificationView,
} from "./notificationCopy";
import { notificationCategoryValidator } from "./notificationKinds";
import { emailAllowed, pushAllowed, resolvePrefs } from "./notificationPrefs";
import { londonDayRange, londonHour } from "./londonTime";
import { notify } from "./notify";

type Ctx = QueryCtx | MutationCtx;

/** Most browsers / devices we push to per person. */
const MAX_PUSH_TARGETS = 20;

/** What renderNotification needs: the row plus the actor's first name. */
export async function loadView(ctx: Ctx, n: Doc<"notifications">): Promise<NotificationView> {
  const actor = n.actorId ? await ctx.db.get(n.actorId) : null;
  // A deleted account reads as "Someone".
  const name = actor && actor.deletedAt === undefined ? actor.name : undefined;
  return {
    kind: n.kind,
    actorName: name?.trim().split(/\s+/)[0] || null,
    ...(n.actorId ? { actorId: n.actorId } : {}),
    ...(n.listingId ? { listingId: n.listingId } : {}),
    ...(n.requestId ? { requestId: n.requestId } : {}),
    data: n.data ?? {},
  };
}

const subscriptionValidator = v.object({
  endpoint: v.string(),
  p256dh: v.string(),
  auth: v.string(),
});

/**
 * Everything `deliver` needs, after the recipient's prefs: the push (web
 * subscriptions + Expo tokens) and which email to send, if any.
 */
export const getDeliveryPlan = internalQuery({
  args: { notificationId: v.id("notifications") },
  returns: v.union(
    v.null(),
    v.object({
      push: v.union(
        v.null(),
        v.object({
          title: v.string(),
          body: v.string(),
          url: v.string(),
          tag: v.string(),
          /** For the phone app: which listing a "Want to go" alert is about. */
          listingId: v.optional(v.id("listings")),
          webSubscriptions: v.array(subscriptionValidator),
          expoTokens: v.array(v.string()),
        }),
      ),
      email: v.union(
        v.null(),
        v.object({ type: v.literal("request"), requestId: v.id("requests") }),
        v.object({
          type: v.literal("wishlist"),
          listingId: v.id("listings"),
          userId: v.id("users"),
        }),
        v.object({ type: v.literal("notice") }),
      ),
    }),
  ),
  handler: async (ctx, { notificationId }) => {
    const n = await ctx.db.get(notificationId);
    if (!n) return null;
    const user = await ctx.db.get(n.userId);
    if (!user || user.deletedAt !== undefined) return null;

    let push = null;
    if (pushAllowed(user, n.category)) {
      const rendered = renderNotification(await loadView(ctx, n));
      const subs = await ctx.db
        .query("webPushSubscriptions")
        .withIndex("by_userId", (q) => q.eq("userId", n.userId))
        .take(MAX_PUSH_TARGETS);
      const tokens = await ctx.db
        .query("pushTokens")
        .withIndex("by_userId", (q) => q.eq("userId", n.userId))
        .take(MAX_PUSH_TARGETS);
      push = {
        title: rendered.title,
        body: rendered.body,
        url: rendered.url,
        tag: n.dedupeKey,
        ...(n.listingId ? { listingId: n.listingId } : {}),
        webSubscriptions: subs.map((s) => ({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth })),
        expoTokens: tokens.map((t) => t.token),
      };
    }

    let email = null;
    if (emailAllowed(user, n.category)) {
      if (n.kind === "request_received" && n.requestId) {
        email = { type: "request" as const, requestId: n.requestId };
      } else if (n.kind === "wishlist_listing" && n.listingId) {
        email = { type: "wishlist" as const, listingId: n.listingId, userId: n.userId };
      } else if (EMAIL_NOTICE_KINDS.has(n.kind)) {
        email = { type: "notice" as const };
      }
    }

    return { push, email };
  },
});

/** The push service said these browsers are gone (404/410). */
export const removeWebPushSubscriptions = internalMutation({
  args: { endpoints: v.array(v.string()) },
  returns: v.null(),
  handler: async (ctx, { endpoints }) => {
    for (const endpoint of endpoints) {
      const rows = await ctx.db
        .query("webPushSubscriptions")
        .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
        .take(10);
      for (const row of rows) await ctx.db.delete(row._id);
    }
    return null;
  },
});

/** The badge shows "9+" past this. */
export const UNREAD_CAP = 10;
/** Most browsers one person keeps subscribed. */
const MAX_SUBSCRIPTIONS_PER_USER = 10;

/** Unread count, and whether to offer "Turn on alerts?" (after a first request, listing or invite). */
export const getBellState = query({
  args: {},
  returns: v.union(v.null(), v.object({ unread: v.number(), alertsEligible: v.boolean() })),
  handler: async (ctx) => {
    const userId = await optionalUserId(ctx);
    if (!userId) return null;
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_userId_and_readAt", (q) => q.eq("userId", userId).eq("readAt", undefined))
      .take(UNREAD_CAP);
    const sent = await ctx.db
      .query("requests")
      .withIndex("by_fromUserId", (q) => q.eq("fromUserId", userId))
      .first();
    const hosted = sent
      ? null
      : await ctx.db
          .query("listings")
          .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", userId))
          .first();
    const invited =
      sent || hosted
        ? null
        : await ctx.db
            .query("partyInvites")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();
    return { unread: unread.length, alertsEligible: !!(sent || hosted || invited) };
  },
});

async function actionFor(ctx: QueryCtx, n: Doc<"notifications">, userId: Id<"users">) {
  if (n.kind === "party_invite" && n.requestId) {
    const req = await ctx.db.get(n.requestId);
    const seat = req?.party?.find((p) => p.kind === "friend" && p.userId === userId);
    if (!req || req.status !== "pending" || !seat) {
      return { type: "party" as const, state: "closed" as const };
    }
    return { type: "party" as const, state: seat.response ?? ("pending" as const) };
  }
  if (n.kind === "request_received" && n.requestId) {
    const req = await ctx.db.get(n.requestId);
    return { type: "request" as const, state: req ? req.status : ("gone" as const) };
  }
  return null;
}

/** The bell panel, newest first, 30 at a time. */
export const listMyNotifications = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const userId = await optionalUserId(ctx);
    if (!userId) return { page: [], isDone: true, continueCursor: "" };
    const result = await ctx.db
      .query("notifications")
      .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate(paginationOpts);
    const page = [];
    for (const n of result.page) {
      const rendered = renderNotification(await loadView(ctx, n));
      const found = n.actorId ? await ctx.db.get(n.actorId) : null;
      const actor = found && found.deletedAt === undefined ? found : null;
      page.push({
        _id: n._id,
        kind: n.kind,
        category: n.category,
        createdAt: n.createdAt,
        ...(n.readAt !== undefined ? { readAt: n.readAt } : {}),
        ...(n.requestId ? { requestId: n.requestId } : {}),
        url: rendered.url,
        segments: rendered.segments,
        actor: actor
          ? {
              _id: actor._id,
              name: actor.name,
              avatar: await visibleAvatar(ctx, userId, actor),
            }
          : null,
        action: await actionFor(ctx, n, userId),
      });
    }
    return { ...result, page };
  },
});

/** Opening the panel reads everything. */
export const markAllRead = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const { userId } = await requireActiveUser(ctx);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_userId_and_readAt", (q) => q.eq("userId", userId).eq("readAt", undefined))
      .take(200);
    const now = Date.now();
    for (const n of unread) await ctx.db.patch(n._id, { readAt: now });
    return null;
  },
});

export const getMyNotificationPrefs = query({
  args: {},
  handler: async (ctx) => {
    const userId = await optionalUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    return user ? resolvePrefs(user) : null;
  },
});

export const setNotificationPref = mutation({
  args: {
    channel: v.union(v.literal("push"), v.literal("email")),
    category: notificationCategoryValidator,
    enabled: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, { channel, category, enabled }) => {
    const { userId, user } = await requireActiveUser(ctx);
    const prefs = resolvePrefs(user);
    await ctx.db.patch(userId, {
      notificationPrefs: {
        ...prefs,
        [channel]: { ...prefs[channel], [category]: enabled },
      },
    });
    return null;
  },
});

/** Save this browser's push subscription (or move it to whoever's signed in now). */
export const saveWebPushSubscription = mutation({
  args: { endpoint: v.string(), p256dh: v.string(), auth: v.string() },
  returns: v.null(),
  handler: async (ctx, { endpoint, p256dh, auth }) => {
    const { userId } = await requireActiveUser(ctx);
    if (!endpoint.startsWith("https://") || endpoint.length > 1000) {
      throw new Error("That isn't a push subscription.");
    }
    const existing = await ctx.db
      .query("webPushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
      .first();
    if (existing) {
      if (existing.userId !== userId || existing.p256dh !== p256dh || existing.auth !== auth) {
        await ctx.db.patch(existing._id, { userId, p256dh, auth });
      }
      return null;
    }
    const mine = await ctx.db
      .query("webPushSubscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(MAX_SUBSCRIPTIONS_PER_USER);
    if (mine.length >= MAX_SUBSCRIPTIONS_PER_USER) {
      const oldest = mine.reduce((a, b) => (a.createdAt <= b.createdAt ? a : b));
      await ctx.db.delete(oldest._id);
    }
    await ctx.db.insert("webPushSubscriptions", {
      userId,
      endpoint,
      p256dh,
      auth,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const removeMyWebPushSubscription = mutation({
  args: { endpoint: v.string() },
  returns: v.null(),
  handler: async (ctx, { endpoint }) => {
    const { userId } = await requireActiveUser(ctx);
    const existing = await ctx.db
      .query("webPushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
      .first();
    if (existing && existing.userId === userId) await ctx.db.delete(existing._id);
    return null;
  },
});

/** Reminders go out at 9am Oxford time. */
export const REMINDER_HOUR = 9;
export const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
const PRUNE_BATCH = 500;

/**
 * "Worcester is tomorrow at 7:30 pm." to everyone seated at a formal tomorrow
 * (formals with at least one guest). The cron fires at 08:00 and 09:00 UTC so
 * one of them is 09:00 in London whatever the season; the other does nothing.
 */
export const sendFormalReminders = internalMutation({
  args: {},
  returns: v.object({ sent: v.number() }),
  handler: async (ctx) => {
    const now = Date.now();
    if (londonHour(now) !== REMINDER_HOUR) return { sent: 0 };
    const { start, end } = londonDayRange(now, 1);
    const from = new Date(start).toISOString();
    const to = new Date(end).toISOString();
    let sent = 0;
    for (const status of ["active", "confirmed", "closed"] as const) {
      const listings = await ctx.db
        .query("listings")
        .withIndex("by_status_and_dateTime", (q) =>
          q.eq("status", status).gte("dateTime", from).lt("dateTime", to),
        )
        .take(200);
      for (const listing of listings) {
        const guests = (listing.guestSeats ?? []).reduce((n, g) => n + g.count, 0);
        if (listing.members.length + guests < 2) continue;
        for (const userId of listing.members) {
          const id = await notify(ctx, {
            userId,
            kind: "formal_tomorrow",
            listingId: listing._id,
            data: { college: listing.college, dateTime: listing.dateTime },
          });
          if (id) sent++;
        }
      }
    }
    return { sent };
  },
});

/** Daily: notifications older than 90 days go, in batches. */
export const pruneOldNotifications = internalMutation({
  args: {},
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx) => {
    const cutoff = Date.now() - RETENTION_MS;
    const old = await ctx.db
      .query("notifications")
      .withIndex("by_createdAt", (q) => q.lt("createdAt", cutoff))
      .take(PRUNE_BATCH);
    for (const n of old) await ctx.db.delete(n._id);
    if (old.length === PRUNE_BATCH) {
      await ctx.scheduler.runAfter(0, internal.notifications.pruneOldNotifications, {});
    }
    return { deleted: old.length };
  },
});
