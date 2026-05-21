import type { ChatMessage } from "@/src/lib/chat/types";
import { formatChatDayLabel, timestampToLocalDateKey } from "@/src/lib/data/format";

export type ChatThreadRow =
  | { kind: "message"; message: ChatMessage }
  | { kind: "dateDivider"; dateKey: string; label: string };

/** Build flat list rows with a date divider after the last message of each day (for inverted lists). `messages` must be newest-first (matching `listMessages` desc order). */
export function buildThreadItems(messages: ChatMessage[]): ChatThreadRow[] {
  const rows: ChatThreadRow[] = [];

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    rows.push({ kind: "message", message });

    const dateKey = timestampToLocalDateKey(message.createdAt);
    const next = messages[i + 1];
    const nextDateKey = next
      ? timestampToLocalDateKey(next.createdAt)
      : null;

    if (dateKey !== nextDateKey) {
      rows.push({
        kind: "dateDivider",
        dateKey,
        label: formatChatDayLabel(message.createdAt),
      });
    }
  }

  return rows;
}

export function threadRowKey(row: ChatThreadRow): string {
  if (row.kind === "message") return row.message.id;
  return `date-${row.dateKey}`;
}
