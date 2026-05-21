import {
  computeStickyFromViewables,
  shouldHideInlineDivider,
  type StickyChatDateState,
} from "@/src/components/chat/stickyChatDateLogic";
import { formatChatDayLabel } from "@/src/lib/data/format";
import type { ChatThreadRow } from "@/src/lib/chat/threadItems";
import { useCallback, useEffect, useRef, useState } from "react";
import type { NativeScrollEvent, ViewToken } from "react-native";

const viewabilityConfig = { itemVisiblePercentThreshold: 5 };

export function useStickyChatDate(threadItems: ChatThreadRow[]) {
  const viewableRef = useRef<ViewToken[]>([]);
  const offsetRef = useRef(0);
  const snapshotRef = useRef<StickyChatDateState>({
    stickyLabel: null,
    pushOffset: 0,
    topIndex: null,
  });

  const [stickyLabel, setStickyLabel] = useState<string | null>(null);
  const [pushOffset, setPushOffset] = useState(0);
  const [topIndex, setTopIndex] = useState<number | null>(null);

  const apply = useCallback(
    (next: StickyChatDateState) => {
      const prev = snapshotRef.current;
      if (
        prev.stickyLabel === next.stickyLabel &&
        prev.pushOffset === next.pushOffset &&
        prev.topIndex === next.topIndex
      ) {
        return;
      }
      snapshotRef.current = next;
      setStickyLabel(next.stickyLabel);
      setPushOffset(next.pushOffset);
      setTopIndex(next.topIndex);
    },
    [],
  );

  const recompute = useCallback(() => {
    const next = computeStickyFromViewables(
      threadItems,
      viewableRef.current,
      offsetRef.current,
      formatChatDayLabel,
    );
    apply(next);
  }, [apply, threadItems]);

  const onScroll = useCallback(
    (event: NativeScrollEvent) => {
      offsetRef.current = event.contentOffset.y;
      recompute();
    },
    [recompute],
  );

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      viewableRef.current = viewableItems;
      recompute();
    },
    [recompute],
  );

  const onViewableItemsChangedRef = useRef(onViewableItemsChanged);
  useEffect(() => {
    onViewableItemsChangedRef.current = onViewableItemsChanged;
  }, [onViewableItemsChanged]);

  const stableOnViewableItemsChanged = useRef(
    (info: { viewableItems: ViewToken[] }) => {
      onViewableItemsChangedRef.current(info);
    },
  ).current;

  const getDividerOpacity = useCallback(
    (_dateKey: string, dividerLabel: string, dividerIndex: number) => {
      if (
        shouldHideInlineDivider(stickyLabel, dividerLabel, dividerIndex, topIndex)
      ) {
        return 0;
      }
      return 1;
    },
    [stickyLabel, topIndex],
  );

  return {
    stickyLabel,
    pushOffset,
    onScroll,
    onViewableItemsChanged: stableOnViewableItemsChanged,
    viewabilityConfig,
    getDividerOpacity,
  };
}
