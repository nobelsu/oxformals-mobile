export const CHAT_DATE_DIVIDER_HEIGHT = 40;

export type StickyThreadRow =
  | { kind: "message"; message: { createdAt: number } }
  | { kind: "dateDivider"; dateKey: string; label: string };

export type StickyChatDateState = {
  stickyLabel: string | null;
  pushOffset: number;
  topIndex: number | null;
};

export const STICKY_HIDE_OFFSET_THRESHOLD = 48;

type ViewableToken = {
  index: number | null;
  isViewable?: boolean;
};

export function topVisibleIndex(viewableItems: ViewableToken[]): number | null {
  let top: number | null = null;
  for (const token of viewableItems) {
    if (token.index == null || token.isViewable === false) continue;
    if (top === null || token.index > top) {
      top = token.index;
    }
  }
  return top;
}

export function stickyLabelForTopIndex(
  items: StickyThreadRow[],
  topIndex: number,
  dayLabel: (createdAt: number) => string,
): string | null {
  const row = items[topIndex];
  if (!row) return null;
  if (row.kind === "dateDivider") return row.label;
  return dayLabel(row.message.createdAt);
}

export function findNextDividerIndex(
  items: StickyThreadRow[],
  afterIndex: number,
): number | null {
  for (let i = afterIndex + 1; i < items.length; i++) {
    if (items[i].kind === "dateDivider") return i;
  }
  return null;
}

export function computeStickyFromViewables(
  items: StickyThreadRow[],
  viewableItems: ViewableToken[],
  contentOffsetY: number,
  dayLabel: (createdAt: number) => string,
): StickyChatDateState {
  if (contentOffsetY <= STICKY_HIDE_OFFSET_THRESHOLD) {
    return { stickyLabel: null, pushOffset: 0, topIndex: null };
  }

  const topIndex = topVisibleIndex(viewableItems);
  if (topIndex === null) {
    return { stickyLabel: null, pushOffset: 0, topIndex: null };
  }

  const stickyLabel = stickyLabelForTopIndex(items, topIndex, dayLabel);
  if (!stickyLabel) {
    return { stickyLabel: null, pushOffset: 0, topIndex };
  }

  let pushOffset = 0;
  const nextDividerIndex = findNextDividerIndex(items, topIndex);
  if (nextDividerIndex !== null) {
    const nextRow = items[nextDividerIndex];
    if (
      nextRow.kind === "dateDivider" &&
      nextRow.label !== stickyLabel &&
      viewableItems.some(
        (t) => t.index === nextDividerIndex && t.isViewable !== false,
      )
    ) {
      pushOffset = CHAT_DATE_DIVIDER_HEIGHT;
    }
  }

  return { stickyLabel, pushOffset, topIndex };
}

export function shouldHideInlineDivider(
  stickyLabel: string | null,
  dividerLabel: string,
  dividerIndex: number,
  topIndex: number | null,
): boolean {
  if (!stickyLabel || topIndex === null) return false;
  return dividerIndex === topIndex && dividerLabel === stickyLabel;
}
