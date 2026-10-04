import type { Listing, ListingType, RequestType } from "./types";

export function listingSupportsSwap(listingType: ListingType): boolean {
  return listingType === "swap" || listingType === "both";
}

/** Every listing takes credits, so the button never promises one method. */
export function listingRequestCta(_listingType: ListingType): string {
  return "Request a seat!";
}

export function listingAllowsRequest(
  listing: Listing,
  requestType: RequestType,
): boolean {
  if (listing.listingType === "both") return true;
  return listing.listingType === requestType;
}
