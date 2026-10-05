import { isoToLocalDateKey } from "./format";
import type { Listing } from "./types";

export type ListingDayGroup = {
  /** `YYYY-MM-DD` of the Oxford day. */
  dateKey: string;
  /** ISO of the earliest listing that day: the heading's label source. */
  dateTime: string;
  listings: Listing[];
};

/**
 * Buckets listings into ascending Oxford-day groups. Sorts internally rather
 * than trusting callers: not every consumer hands us an ordered list.
 */
export function groupListingsByDay(listings: Listing[]): ListingDayGroup[] {
  const sorted = [...listings].sort(
    (a, b) => Date.parse(a.dateTime) - Date.parse(b.dateTime),
  );

  const groups: ListingDayGroup[] = [];
  const byKey = new Map<string, ListingDayGroup>();

  for (const listing of sorted) {
    const dateKey = isoToLocalDateKey(listing.dateTime);
    const existing = byKey.get(dateKey);
    if (existing) {
      existing.listings.push(listing);
      continue;
    }
    const group: ListingDayGroup = {
      dateKey,
      dateTime: listing.dateTime,
      listings: [listing],
    };
    byKey.set(dateKey, group);
    groups.push(group);
  }

  return groups;
}
