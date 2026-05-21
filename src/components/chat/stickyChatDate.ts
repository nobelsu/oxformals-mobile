import {
  CHAT_DATE_DIVIDER_HEIGHT,
  computeStickyFromViewables as computeStickyFromViewablesCore,
  findNextDividerIndex,
  shouldHideInlineDivider,
  stickyLabelForTopIndex as stickyLabelForTopIndexCore,
  topVisibleIndex,
  type StickyChatDateState,
} from "@/src/components/chat/stickyChatDateLogic";
import { formatChatDayLabel } from "@/src/lib/data/format";
import type { ChatThreadRow } from "@/src/lib/chat/threadItems";

export {
  CHAT_DATE_DIVIDER_HEIGHT,
  findNextDividerIndex,
  shouldHideInlineDivider,
  topVisibleIndex,
  type StickyChatDateState,
};

export function stickyLabelForTopIndex(
  items: ChatThreadRow[],
  topIndex: number,
): string | null {
  return stickyLabelForTopIndexCore(items, topIndex, formatChatDayLabel);
}

export function computeStickyFromViewables(
  items: ChatThreadRow[],
  viewableItems: Parameters<typeof computeStickyFromViewablesCore>[1],
  contentOffsetY: number,
): StickyChatDateState {
  return computeStickyFromViewablesCore(
    items,
    viewableItems,
    contentOffsetY,
    formatChatDayLabel,
  );
}
