import type { Id } from "@/convex/_generated/dataModel";
import type { ChatMention } from "@/src/lib/chat/types";
import {
  buildMentionBody,
  mentionLength,
  normalizeDisplayName,
  validateMentionStructure,
  type MentionParticipant,
  type MentionValidationResult,
} from "@/src/lib/chat/mentions";

export type MentionTrigger = {
  atIndex: number;
  query: string;
};

function isInsideMention(
  cursor: number,
  mentions: ChatMention[],
): boolean {
  for (const m of mentions) {
    const end = m.start + mentionLength(m.label);
    if (cursor > m.start && cursor < end) return true;
  }
  return false;
}

/** Find active @mention trigger at cursor, or null if not in mention mode. */
export function getMentionTrigger(
  text: string,
  cursor: number,
  mentions: ChatMention[],
): MentionTrigger | null {
  if (cursor < 0 || cursor > text.length) return null;
  if (isInsideMention(cursor, mentions)) return null;

  const textBefore = text.slice(0, cursor);
  let searchEnd = textBefore.length;

  while (searchEnd > 0) {
    const atIndex = textBefore.lastIndexOf("@", searchEnd - 1);
    if (atIndex === -1) return null;

    if (isInsideMention(atIndex + 1, mentions)) {
      searchEnd = atIndex;
      continue;
    }

    const query = textBefore.slice(atIndex + 1);
    if (/[\s\n]/.test(query)) return null;

    return { atIndex, query };
  }

  return null;
}

function shiftMentionsAfter(
  mentions: ChatMention[],
  position: number,
  delta: number,
): ChatMention[] {
  if (delta === 0) return mentions;
  return mentions.map((m) =>
    m.start >= position ? { ...m, start: m.start + delta } : m,
  );
}

function pruneInvalidMentions(
  text: string,
  mentions: ChatMention[],
): ChatMention[] {
  return mentions.filter((m) => {
    const expected = buildMentionBody(m.label);
    return text.slice(m.start, m.start + expected.length) === expected;
  });
}

/** Apply a text edit and keep mention metadata consistent. */
export function applyTextChange(
  prevText: string,
  nextText: string,
  selectionStart: number,
  mentions: ChatMention[],
): { text: string; mentions: ChatMention[] } {
  const prevLen = prevText.length;
  const nextLen = nextText.length;
  const delta = nextLen - prevLen;

  let editStart = 0;
  while (
    editStart < prevLen &&
    editStart < nextLen &&
    prevText[editStart] === nextText[editStart]
  ) {
    editStart++;
  }

  let prevEnd = prevLen;
  let nextEnd = nextLen;
  while (
    prevEnd > editStart &&
    nextEnd > editStart &&
    prevText[prevEnd - 1] === nextText[nextEnd - 1]
  ) {
    prevEnd--;
    nextEnd--;
  }

  let adjusted = mentions;
  if (delta !== 0) {
    adjusted = shiftMentionsAfter(mentions, editStart, delta);
  }
  adjusted = pruneInvalidMentions(nextText, adjusted);

  return { text: nextText, mentions: adjusted };
}

export function insertMention(
  text: string,
  cursor: number,
  mentions: ChatMention[],
  user: MentionParticipant,
): { text: string; cursor: number; mentions: ChatMention[] } {
  const trigger = getMentionTrigger(text, cursor, mentions);
  if (!trigger) {
    return { text, cursor, mentions };
  }

  const label = normalizeDisplayName(user.name);
  const mentionText = buildMentionBody(label);
  const before = text.slice(0, trigger.atIndex);
  const after = text.slice(cursor);
  const nextText = before + mentionText + after;
  const delta = mentionText.length - (cursor - trigger.atIndex);

  const newMention: ChatMention = {
    userId: user.id as Id<"users">,
    label,
    start: trigger.atIndex,
  };

  const shifted = shiftMentionsAfter(mentions, trigger.atIndex, delta);
  const nextMentions = [...shifted, newMention].sort(
    (a, b) => a.start - b.start,
  );

  const nextCursor = trigger.atIndex + mentionText.length;
  return {
    text: nextText,
    cursor: nextCursor,
    mentions: pruneInvalidMentions(nextText, nextMentions),
  };
}

export function buildComposePayload(
  text: string,
  mentions: ChatMention[],
): MentionValidationResult & { body: string } {
  const body = text.trim();
  const validMentions = pruneInvalidMentions(body, mentions);
  const result = validateMentionStructure(body, validMentions);
  if (!result.ok) {
    return { ...result, body };
  }
  return { ok: true, mentions: result.mentions, body };
}
