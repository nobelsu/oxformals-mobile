import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { blockedIdsFor } from "./blocks";
import { optionalUserId, requireActiveUser } from "./guards";
import { visibleAvatar } from "./userVisibility";

/** Most address-book entries one lookup may send. */
export const MAX_CONTACTS = 1000;
/** Most numbers or emails read from any one entry. */
const MAX_PER_CONTACT = 5;
/** How many accounts are scanned for a phone match. */
const USER_SCAN = 5000;
/** Phones match on their last digits, so "+44 7700 900123" finds "07700 900123". */
const PHONE_KEY_DIGITS = 10;

/** The comparable part of a phone number, or null if it's too short to trust. */
export function phoneKey(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  return digits.length >= PHONE_KEY_DIGITS ? digits.slice(-PHONE_KEY_DIGITS) : null;
}

const matchValidator = v.object({
  /** Position of the address-book entry this account matched. */
  contactIndex: v.number(),
  id: v.id("users"),
  name: v.string(),
  college: v.union(v.string(), v.null()),
  avatar: v.optional(
    v.union(
      v.object({ kind: v.literal("preset"), id: v.string() }),
      v.object({ kind: v.literal("image"), dataUrl: v.string() }),
    ),
  ),
  following: v.union(v.literal("none"), v.literal("pending"), v.literal("active")),
});

/**
 * Which of the people in your address book are on Oxformals. The numbers and
 * emails are compared and thrown away: nothing sent here is stored.
 *
 * A mutation rather than a query so the (large) arguments aren't kept in a
 * live subscription; it writes nothing. Leaves out yourself, deleted and
 * unfinished accounts, anyone blocked either way, and anyone who switched off
 * "Let my contacts find me".
 */
export const matchContacts = mutation({
  args: {
    contacts: v.array(
      v.object({ phones: v.array(v.string()), emails: v.array(v.string()) }),
    ),
  },
  returns: v.array(matchValidator),
  handler: async (ctx, { contacts }) => {
    const { userId: me } = await requireActiveUser(ctx);
    if (contacts.length > MAX_CONTACTS) {
      throw new ConvexError(`That's too many contacts at once (the limit is ${MAX_CONTACTS}).`);
    }

    // First entry wins when two share a number or address.
    const byPhone = new Map<string, number>();
    const byEmail = new Map<string, number>();
    contacts.forEach((contact, index) => {
      for (const raw of contact.phones.slice(0, MAX_PER_CONTACT)) {
        const key = phoneKey(raw);
        if (key && !byPhone.has(key)) byPhone.set(key, index);
      }
      for (const raw of contact.emails.slice(0, MAX_PER_CONTACT)) {
        const email = raw.trim().toLowerCase();
        if (email.includes("@") && !byEmail.has(email)) byEmail.set(email, index);
      }
    });

    const found = new Map<Id<"users">, { user: Doc<"users">; contactIndex: number }>();
    for (const [email, contactIndex] of byEmail) {
      const user = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", email))
        .first();
      if (user && !found.has(user._id)) found.set(user._id, { user, contactIndex });
    }
    if (byPhone.size > 0) {
      const users = await ctx.db.query("users").take(USER_SCAN);
      for (const user of users) {
        if (!user.whatsappPhone || found.has(user._id)) continue;
        const key = phoneKey(user.whatsappPhone);
        const contactIndex = key ? byPhone.get(key) : undefined;
        if (contactIndex !== undefined) found.set(user._id, { user, contactIndex });
      }
    }

    const blocked = await blockedIdsFor(ctx, me);
    const out = [];
    for (const { user, contactIndex } of found.values()) {
      if (user._id === me || user.deletedAt !== undefined || blocked.has(user._id)) continue;
      if (user.discoverableByContacts === false) continue;
      const name = user.name?.trim();
      if (!name || !user.college?.trim()) continue;
      const follow = await ctx.db
        .query("follows")
        .withIndex("by_followerId_and_followeeId", (q) =>
          q.eq("followerId", me).eq("followeeId", user._id),
        )
        .unique();
      const avatar = await visibleAvatar(ctx, me, user);
      out.push({
        contactIndex,
        id: user._id,
        name,
        college: user.college.trim(),
        ...(avatar ? { avatar } : {}),
        following: follow ? follow.status : ("none" as const),
      });
    }
    out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  },
});

/** Whether people who have your number or email can find you. On unless switched off. */
export const getContactDiscovery = query({
  args: {},
  returns: v.union(v.null(), v.object({ discoverable: v.boolean() })),
  handler: async (ctx) => {
    const userId = await optionalUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    return user ? { discoverable: user.discoverableByContacts !== false } : null;
  },
});

export const setContactDiscovery = mutation({
  args: { discoverable: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { discoverable }) => {
    const { userId } = await requireActiveUser(ctx);
    await ctx.db.patch(userId, { discoverableByContacts: discoverable });
    return null;
  },
});
