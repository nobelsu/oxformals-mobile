import { setActiveConversationId } from "@/src/lib/push/activeChatState";
import type { Id } from "@/convex/_generated/dataModel";
import {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
} from "react";

const ActiveChatContext = createContext<{
  setActiveConversation: (id: Id<"conversations"> | null) => void;
} | null>(null);

export function ActiveChatProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    return () => setActiveConversationId(null);
  }, []);

  return (
    <ActiveChatContext.Provider
      value={{
        setActiveConversation: (id) => {
          setActiveConversationId(id);
        },
      }}
    >
      {children}
    </ActiveChatContext.Provider>
  );
}

export function useActiveChat(): {
  setActiveConversation: (id: Id<"conversations"> | null) => void;
} {
  const ctx = useContext(ActiveChatContext);
  if (!ctx) {
    return { setActiveConversation: () => {} };
  }
  return ctx;
}
