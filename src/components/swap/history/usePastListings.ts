import { useAuth } from "@/src/components/auth/useAuth";
import { useData } from "@/src/components/data/useData";
import type { Listing } from "@/src/lib/data/types";
import { useMemo } from "react";

const PAST_STATUSES = new Set<Listing["status"]>([
  "confirmed",
  "closed",
  "expired",
]);

export function usePastListings(): Listing[] {
  const { user } = useAuth();
  const { listings } = useData();

  return useMemo(() => {
    if (!user) return [];
    return listings
      .filter(
        (l) => l.ownerUserId === user.id && PAST_STATUSES.has(l.status),
      )
      .sort((a, b) => +new Date(b.dateTime) - +new Date(a.dateTime));
  }, [listings, user]);
}
