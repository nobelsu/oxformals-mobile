import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  categoryOf,
  type NotificationData,
  type NotificationKind,
} from "./notificationKinds";

export const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

export type NotifyArgs = {
  userId: Id<"users">;
  kind: NotificationKind;
  actorId?: Id<"users">;
  listingId?: Id<"listings">;
  requestId?: Id<"requests">;
  data?: NotificationData;
};

/** kind + the ids involved (+ a party answer, so "in" then "out" both show). */
export function dedupeKeyFor(args: NotifyArgs): string {
  return [
    args.kind,
    args.actorId ?? "",
    args.listingId ?? "",
    args.requestId ?? "",
    args.data?.response ?? "",
  ].join(":");
}

/**
 * Record that something happened to `userId` and schedule its push/email.
 * Call it inside the mutation where the event happens, so it commits (or rolls
 * back) with it. Returns null when skipped: yourself, a deleted user, or the
 * same thing within the last 24h.
 */
export async function notify(
  ctx: MutationCtx,
  args: NotifyArgs,
): Promise<Id<"notifications"> | null> {
  if (args.actorId !== undefined && args.actorId === args.userId) return null;
  const user = await ctx.db.get(args.userId);
  if (!user || user.deletedAt !== undefined) return null;

  const now = Date.now();
  const dedupeKey = dedupeKeyFor(args);
  const last = await ctx.db
    .query("notifications")
    .withIndex("by_userId_and_dedupeKey", (q) =>
      q.eq("userId", args.userId).eq("dedupeKey", dedupeKey),
    )
    .order("desc")
    .first();
  if (last && now - last.createdAt < DEDUPE_WINDOW_MS) return null;

  const notificationId = await ctx.db.insert("notifications", {
    userId: args.userId,
    category: categoryOf(args.kind),
    kind: args.kind,
    ...(args.actorId !== undefined ? { actorId: args.actorId } : {}),
    ...(args.listingId !== undefined ? { listingId: args.listingId } : {}),
    ...(args.requestId !== undefined ? { requestId: args.requestId } : {}),
    ...(args.data !== undefined ? { data: args.data } : {}),
    dedupeKey,
    createdAt: now,
  });
  await ctx.scheduler.runAfter(0, internal.notificationDelivery.deliver, {
    notificationId,
  });
  return notificationId;
}
