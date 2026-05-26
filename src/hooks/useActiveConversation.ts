import { useActiveChat } from "@/src/contexts/ActiveChatContext";
import type { Id } from "@/convex/_generated/dataModel";
import { setActiveConversationId } from "@/src/lib/push/activeChatState";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

/** Marks this conversation as foreground so chat pushes are suppressed. */
export function useActiveConversation(
  conversationId: Id<"conversations"> | undefined,
): void {
  const { setActiveConversation } = useActiveChat();

  // Keep module state in sync before focus effects run (suppresses foreground push).
  setActiveConversationId(conversationId ?? null);

  useFocusEffect(
    useCallback(() => {
      setActiveConversation(conversationId ?? null);
      return () => setActiveConversation(null);
    }, [conversationId, setActiveConversation]),
  );
}
