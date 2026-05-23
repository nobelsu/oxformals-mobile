import type { Listing, ListingStatus } from "./types";

const EDITABLE_STATUSES: ListingStatus[] = ["active", "confirmed", "closed"];

export function canEditListing(
  listing: Listing,
  pendingRequestCount: number,
): boolean {
  if (pendingRequestCount > 0) return false;
  return EDITABLE_STATUSES.includes(listing.status);
}

export function listingEditBlockedReason(
  listing: Listing,
  pendingRequestCount: number,
): string | null {
  if (pendingRequestCount > 0) {
    return "Resolve pending requests before editing.";
  }
  if (listing.status === "expired") {
    return "Past listings cannot be edited.";
  }
  if (!EDITABLE_STATUSES.includes(listing.status)) {
    return "This listing cannot be edited.";
  }
  return null;
}
