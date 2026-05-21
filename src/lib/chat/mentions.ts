import type { Id } from "@/convex/_generated/dataModel";
import type { ChatMention } from "@/src/lib/chat/types";

export const MAX_MENTIONS_PER_MESSAGE = 10;

export type MentionParticipant = {
  id: Id<"users">;
  name: string;
  college?: string;
};

export type { ChatMention };

export type MessageBodySegment =
  | { type: "text"; text: string }
  | { type: "mention"; userId: Id<"users">; label: string };

export function normalizeDisplayName(name: string | undefined | null): string {
  const trimmed = (name ?? "").trim().replace(/\s+/g, " ");
  return trimmed.length > 0 ? trimmed : "User";
}

export function buildMentionBody(label: string): string {
  return `@${label}`;
}

export function mentionLength(label: string): number {
  return label.length + 1;
}

function normalizeMentionQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Prefix match on display name (case-insensitive, supports spaces in names). */
export function filterMentionCandidates(
  query: string,
  participants: MentionParticipant[],
): MentionParticipant[] {
  const normalizedQuery = normalizeMentionQuery(query);
  return participants
    .map((p) => ({
      id: p.id,
      name: normalizeDisplayName(p.name),
    }))
    .filter((p) => {
      if (normalizedQuery.length === 0) return true;
      return p.name.toLowerCase().startsWith(normalizedQuery);
    });
}

export type MentionValidationResult =
  | { ok: true; mentions: ChatMention[] }
  | { ok: false; error: string };

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

export function segmentMessageBody(
  body: string,
  mentions: ChatMention[] | undefined,
): MessageBodySegment[] {
  if (!mentions || mentions.length === 0) {
    return body.length > 0 ? [{ type: "text", text: body }] : [];
  }

  const sorted = [...mentions].sort((a, b) => a.start - b.start);
  const segments: MessageBodySegment[] = [];
  let cursor = 0;

  for (const m of sorted) {
    const len = mentionLength(m.label);
    if (m.start > cursor) {
      segments.push({ type: "text", text: body.slice(cursor, m.start) });
    }
    if (m.start >= cursor) {
      segments.push({
        type: "mention",
        userId: m.userId,
        label: m.label,
      });
      cursor = m.start + len;
    }
  }

  if (cursor < body.length) {
    segments.push({ type: "text", text: body.slice(cursor) });
  }

  return segments;
}

export const MENTION_SPAN_SELECTOR = "[data-mention-user-id][data-mention-label]";

export function serializeMentionEditor(root: HTMLElement): {
  body: string;
  mentions: ChatMention[];
} {
  let body = "";
  const mentions: ChatMention[] = [];

  function walk(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      body += node.textContent ?? "";
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as HTMLElement;
    const userId = el.getAttribute("data-mention-user-id");
    const label = el.getAttribute("data-mention-label");
    if (userId && label) {
      const start = body.length;
      const mentionText = buildMentionBody(label);
      body += mentionText;
      mentions.push({
        userId: userId as Id<"users">,
        label,
        start,
      });
      return;
    }

    if (el.tagName === "BR") {
      body += "\n";
      return;
    }

    for (const child of el.childNodes) {
      walk(child);
    }
  }

  for (const child of root.childNodes) {
    walk(child);
  }

  return { body, mentions };
}

export function clearMentionEditor(root: HTMLElement) {
  root.innerHTML = "";
}
