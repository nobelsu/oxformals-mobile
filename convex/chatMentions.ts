import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export const MAX_MENTIONS_PER_MESSAGE = 10;

export type ChatMention = {
  userId: Id<"users">;
  label: string;
  start: number;
};

function buildMentionBody(label: string): string {
  return `@${label}`;
}

function mentionLength(label: string): number {
  return label.length + 1;
}

export function normalizeDisplayName(name: string | undefined | null): string {
  const trimmed = (name ?? "").trim().replace(/\s+/g, " ");
  return trimmed.length > 0 ? trimmed : "User";
}

export type MentionValidationResult =
  | { ok: true; mentions: ChatMention[] }
  | { ok: false; error: string };

/** Validates anchors and body slices only (no user allowlist). */
export function validateMentionStructure(
  body: string,
  mentions: ChatMention[],
): MentionValidationResult {
  if (mentions.length > MAX_MENTIONS_PER_MESSAGE) {
    return {
      ok: false,
      error: `At most ${MAX_MENTIONS_PER_MESSAGE} mentions per message`,
    };
  }

  const sorted = [...mentions].sort((a, b) => a.start - b.start);

  for (let i = 0; i < sorted.length; i++) {
    const m = sorted[i]!;
    if (m.start < 0 || !Number.isInteger(m.start)) {
      return { ok: false, error: "Invalid mention position" };
    }
    if (!m.label || m.label.length === 0) {
      return { ok: false, error: "Invalid mention label" };
    }

    const expected = buildMentionBody(m.label);
    const actual = body.slice(m.start, m.start + expected.length);
    if (actual !== expected) {
      return { ok: false, error: "Mention text does not match message body" };
    }

    const end = m.start + expected.length;
    if (i > 0) {
      const prev = sorted[i - 1]!;
      const prevEnd = prev.start + mentionLength(prev.label);
      if (m.start < prevEnd) {
        return { ok: false, error: "Overlapping mentions" };
      }
    }
    if (end > body.length) {
      return { ok: false, error: "Mention extends past end of message" };
    }
  }

  return { ok: true, mentions: sorted };
}

type Ctx = QueryCtx | MutationCtx;

/** Ensures each mentioned user exists and label matches their display name. */
export async function validateMentionUsers(
  ctx: Ctx,
  mentions: ChatMention[],
): Promise<MentionValidationResult> {
  for (const m of mentions) {
    const user = await ctx.db.get(m.userId);
    if (!user) {
      return { ok: false, error: "Invalid mention user" };
    }
    const expectedLabel = normalizeDisplayName(user.name);
    if (m.label !== expectedLabel) {
      return {
        ok: false,
        error: "Mention label does not match user name",
      };
    }
  }
  return { ok: true, mentions };
}
