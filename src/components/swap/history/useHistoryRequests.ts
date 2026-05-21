import { useAuth } from "@/src/components/auth/useAuth";
import { useData } from "@/src/components/data/useData";
import {
  incomingRequestsForUser,
  outgoingRequestsForUser,
} from "@/src/lib/data/requestFilters";
import type { SwapRequest } from "@/src/lib/data/types";
import { useMemo } from "react";
import type { RequestDirection } from "./constants";

export function useHistoryRequests(direction: RequestDirection): SwapRequest[] {
  const { user } = useAuth();
  const { requests } = useData();

  return useMemo(() => {
    if (!user) return [];
    const filtered =
      direction === "incoming"
        ? incomingRequestsForUser(requests, user.id)
        : outgoingRequestsForUser(requests, user.id);
    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  }, [requests, user, direction]);
}
