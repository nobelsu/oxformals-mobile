import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { canSeeActivity } from "./follows";
import { sanitizeLimitedUser, sanitizePublicUser } from "./guards";

/**
 * How other members appear to a viewer. A private account the viewer can't
 * see (not themselves, not an approved follower) shows only who they are —
 * name, college, year, role — with an initials avatar. Callers with a
 * relationship that already justifies more (chat participants, a matched
 * counterparty, host and guest on one formal) skip this on purpose.
 */

type Ctx = QueryCtx | MutationCtx;

export type VisibleUser = ReturnType<typeof sanitizePublicUser>;

export async function visibleUser(
  ctx: Ctx,
  viewerId: Id<"users"> | null,
  user: Doc<"users">,
): Promise<VisibleUser> {
  return (await canSeeActivity(ctx, viewerId, user))
    ? sanitizePublicUser(user)
    : sanitizeLimitedUser(user);
}

/** The avatar a viewer may see; `undefined` means initials. */
export async function visibleAvatar(
  ctx: Ctx,
  viewerId: Id<"users"> | null,
  user: Doc<"users">,
): Promise<Doc<"users">["avatar"]> {
  if (!user.avatar) return undefined;
  return (await canSeeActivity(ctx, viewerId, user)) ? user.avatar : undefined;
}
