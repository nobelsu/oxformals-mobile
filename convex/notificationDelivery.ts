"use node";

import webpush from "web-push";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, type ActionCtx } from "./_generated/server";
import { deliverExpoPushMessages } from "./expoPush";
import {
  sendToSubscriptions,
  type WebPushSender,
  type WebPushSubscription,
} from "./webPushCore";

/** The `web-push` sender, or null when VAPID keys aren't configured. */
function webPushSender(): WebPushSender | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:team@oxformals.com";
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return async (sub, payload) => {
    try {
      const res = await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        { TTL: 24 * 60 * 60 },
      );
      return res.statusCode;
    } catch (err) {
      if (err instanceof webpush.WebPushError) return err.statusCode;
      throw err;
    }
  };
}

/** Push to a user's browsers and forget the ones that are gone. */
async function sendWeb(
  ctx: ActionCtx,
  subs: WebPushSubscription[],
  message: { title: string; body: string; url: string; tag: string },
): Promise<void> {
  if (subs.length === 0) return;
  const send = webPushSender();
  if (!send) {
    console.warn("VAPID keys are not set; skipping web push");
    return;
  }
  const gone = await sendToSubscriptions(subs, JSON.stringify(message), send);
  if (gone.length > 0) {
    await ctx.runMutation(internal.notifications.removeWebPushSubscriptions, {
      endpoints: gone,
    });
  }
}

/** Sends one notification's push and email, per the recipient's prefs. */
export const deliver = internalAction({
  args: { notificationId: v.id("notifications") },
  returns: v.null(),
  handler: async (ctx, { notificationId }) => {
    const plan = await ctx.runQuery(internal.notifications.getDeliveryPlan, {
      notificationId,
    });
    if (!plan) return null;

    // Email first: a push failure must not cost someone their email.
    if (plan.email?.type === "request") {
      await ctx.scheduler.runAfter(0, internal.emails.sendNewRequestEmail, {
        requestId: plan.email.requestId,
      });
    } else if (plan.email?.type === "wishlist") {
      await ctx.scheduler.runAfter(0, internal.emails.sendNewListingAlertEmail, {
        listingId: plan.email.listingId,
        userId: plan.email.userId,
      });
    } else if (plan.email?.type === "notice") {
      await ctx.scheduler.runAfter(0, internal.emails.sendNotificationEmail, {
        notificationId,
      });
    }

    if (plan.push) {
      const { title, body, url, tag } = plan.push;
      try {
        await sendWeb(ctx, plan.push.webSubscriptions, { title, body, url, tag });
      } catch (err) {
        console.error("deliver: web push failed", err);
      }
      const kind = tag.split(":")[0];
      // The phone app already opens "Want to go" alerts at /listing/<id>.
      const data: { url: string } & Record<string, string> =
        kind === "wishlist_listing" && plan.push.listingId
          ? { url: `/listing/${plan.push.listingId}`, listingId: plan.push.listingId, notificationId, kind }
          : { url, notificationId, kind };
      try {
        await deliverExpoPushMessages(
          ctx,
          plan.push.expoTokens.map((to) => ({ to, title, body, data })),
        );
      } catch (err) {
        console.error("deliver: Expo push failed", err);
      }
    }
    return null;
  },
});

/** Web push for one chat message (see getChatWebPushPayload). */
export const sendChatWebPush = internalAction({
  args: { messageId: v.id("messages") },
  returns: v.null(),
  handler: async (ctx, { messageId }) => {
    const payload = await ctx.runQuery(internal.pushNotifications.getChatWebPushPayload, {
      messageId,
    });
    if (!payload) return null;
    for (const item of payload.items) {
      await sendWeb(ctx, item.subscriptions, {
        title: item.title,
        body: item.body,
        url: item.url,
        tag: item.tag,
      });
    }
    return null;
  },
});
